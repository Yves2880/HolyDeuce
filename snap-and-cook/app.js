/* app.js — wires photo → tags → recipes → UI. Plain DOM, no framework. */

(function () {
  const $ = (id) => document.getElementById(id);

  const els = {
    photoBtn: $('photo-btn'),
    photoInput: $('photo-input'),
    previewWrap: $('preview-wrap'),
    canvas: $('preview-canvas'),
    visionStatus: $('vision-status'),
    tagForm: $('tag-form'),
    tagInput: $('tag-input'),
    tagList: $('tag-list'),
    tagsEmptyHint: $('tags-empty-hint'),
    findBtn: $('find-btn'),
    resultsSection: $('results-section'),
    resultsStatus: $('results-status'),
    resultsGrid: $('results-grid'),
    modalOverlay: $('modal-overlay'),
    modalBody: $('modal-body'),
    modalClose: $('modal-close'),
  };

  let lastRecipes = []; // currently displayed recipes (for the modal)

  /* ---------- Tags ---------- */
  function renderTags(list) {
    els.tagList.innerHTML = '';
    list.forEach((tag) => {
      const li = document.createElement('li');
      li.className = 'tag-chip' + (tag.detected ? ' is-detected' : '');
      const label = document.createElement('span');
      label.textContent = (tag.detected ? '📸 ' : '') + tag.name;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-remove';
      btn.setAttribute('aria-label', 'Remove ' + tag.name);
      btn.textContent = '×';
      btn.addEventListener('click', () => Tags.remove(tag.name));
      li.append(label, btn);
      els.tagList.appendChild(li);
    });

    const has = list.length > 0;
    els.tagsEmptyHint.hidden = has;
    els.findBtn.disabled = !has;
  }
  Tags.onChange(renderTags);

  els.tagForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Allow comma-separated entry.
    els.tagInput.value
      .split(',')
      .forEach((part) => Tags.add(part));
    els.tagInput.value = '';
    els.tagInput.focus();
  });

  /* ---------- Photo detection ---------- */
  els.photoBtn.addEventListener('click', () => els.photoInput.click());

  els.photoInput.addEventListener('change', () => {
    const file = els.photoInput.files && els.photoInput.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(img.src);
      els.previewWrap.hidden = false;
      els.visionStatus.innerHTML = '<span class="spinner"></span>Looking at your photo…';
      try {
        const found = await Vision.detect(img, els.canvas);
        if (found.length) {
          const added = Tags.addMany(found, { detected: true });
          els.visionStatus.textContent =
            'Detected: ' + found.join(', ') + (added ? '' : ' (already added)');
        } else {
          els.visionStatus.textContent =
            'No common foods recognised — add your ingredients by hand below.';
        }
      } catch (err) {
        els.visionStatus.textContent = '⚠️ ' + err.message + ' You can still type ingredients below.';
      }
    };
    img.onerror = () => {
      els.visionStatus.textContent = '⚠️ Could not read that image.';
    };
    img.src = URL.createObjectURL(file);
  });

  /* ---------- Find recipes ---------- */
  els.findBtn.addEventListener('click', async () => {
    const names = Tags.names();
    if (!names.length) return;

    els.resultsSection.hidden = false;
    els.resultsGrid.innerHTML = '';
    els.resultsStatus.innerHTML = '<span class="spinner"></span>Searching recipes…';
    els.findBtn.disabled = true;
    els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const recipes = await Recipes.search(names);
      lastRecipes = recipes;
      if (!recipes.length) {
        els.resultsStatus.textContent =
          'No recipes matched those ingredients. Try simpler, single-word items like "chicken" or "egg".';
        return;
      }
      els.resultsStatus.textContent =
        'Found ' + recipes.length + ' recipe' + (recipes.length > 1 ? 's' : '') +
        ', best matches first.';
      recipes.forEach(renderRecipeCard);
    } catch (err) {
      els.resultsStatus.textContent = '⚠️ Could not load recipes: ' + err.message;
    } finally {
      els.findBtn.disabled = false;
    }
  });

  function renderRecipeCard(recipe) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'recipe-card';
    card.addEventListener('click', () => openModal(recipe.id));

    const totalTags = Tags.count();
    const badge =
      '<span class="match-badge">Uses ' + recipe.matchCount +
      ' of your ' + totalTags + '</span>';

    card.innerHTML =
      '<img loading="lazy" src="' + recipe.thumb + '" alt="' + escapeHtml(recipe.title) + '" />' +
      '<div class="rc-body">' +
      badge +
      '<p class="rc-title">' + escapeHtml(recipe.title) + '</p>' +
      '<p class="rc-meta">' + recipe.ingredients.length + ' ingredients · ' +
      escapeHtml(recipe.area || recipe.category || 'Recipe') + '</p>' +
      '</div>';
    els.resultsGrid.appendChild(card);
  }

  /* ---------- Modal ---------- */
  async function openModal(id) {
    const have = new Set(Tags.names());
    els.modalOverlay.hidden = false;
    els.modalBody.innerHTML =
      '<div class="modal-content"><p><span class="spinner"></span>Loading recipe…</p></div>';

    let recipe;
    try {
      recipe = await Recipes.lookupMeal(id); // cached from search()
    } catch (err) {
      els.modalBody.innerHTML =
        '<div class="modal-content"><p>⚠️ Could not load this recipe: ' +
        escapeHtml(err.message) + '</p></div>';
      return;
    }

    const ingredientsHtml = recipe.ingredients
      .map((ing) => {
        const owned = have.has(ing.name.toLowerCase().trim());
        const measure = ing.measure ? ' — ' + escapeHtml(ing.measure) : '';
        return '<li class="' + (owned ? 'have' : '') + '">' +
          (owned ? '✅ ' : '') + escapeHtml(ing.name) + measure + '</li>';
      })
      .join('');

    const stepsHtml = recipe.steps.map((s) => '<li>' + escapeHtml(s) + '</li>').join('');

    const links = [];
    if (recipe.youtube) {
      links.push('<a href="' + recipe.youtube + '" target="_blank" rel="noopener">▶ Watch video</a>');
    }
    if (recipe.source) {
      links.push('<a href="' + recipe.source + '" target="_blank" rel="noopener">Original source</a>');
    }

    els.modalBody.innerHTML =
      '<img class="modal-hero" src="' + recipe.thumb + '" alt="' + escapeHtml(recipe.title) + '" />' +
      '<div class="modal-content">' +
      '<h3>' + escapeHtml(recipe.title) + '</h3>' +
      '<p class="modal-tags">' + escapeHtml([recipe.area, recipe.category].filter(Boolean).join(' · ')) + '</p>' +
      '<h4 class="modal-section-title">Ingredients</h4>' +
      '<ul class="ingredient-list">' + ingredientsHtml + '</ul>' +
      '<h4 class="modal-section-title">Steps</h4>' +
      '<ol class="steps-list">' + stepsHtml + '</ol>' +
      (links.length ? '<div class="modal-links">' + links.join('') + '</div>' : '') +
      '</div>';
  }

  function closeModal() {
    els.modalOverlay.hidden = true;
    els.modalBody.innerHTML = '';
  }
  els.modalClose.addEventListener('click', closeModal);
  els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === els.modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.modalOverlay.hidden) closeModal();
  });

  /* ---------- utils ---------- */
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Expose for the no-network demo fallback / tests if needed.
  window.__app = { openModal };
})();
