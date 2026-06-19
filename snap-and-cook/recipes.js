/* recipes.js — TheMealDB client + ranking.
 *
 * TheMealDB's filter endpoint accepts ONE ingredient and returns minimal meal
 * stubs. To support multiple ingredients we query each one, intersect/rank meal
 * IDs by how many of your ingredients they use, then look up full details for
 * the best candidates. Free public test key "1" is used. */

window.Recipes = (function () {
  const API = 'https://www.themealdb.com/api/json/v1/1';
  const MAX_CANDIDATES = 12; // how many top matches we fetch full details for
  const detailCache = new Map(); // idMeal -> normalized recipe

  function apiName(name) {
    // TheMealDB convention: spaces as underscores.
    return encodeURIComponent(name.trim().replace(/\s+/g, '_'));
  }

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error (' + res.status + ')');
    return res.json();
  }

  // Returns array of stubs {idMeal, strMeal, strMealThumb} for one ingredient.
  async function filterByIngredient(name) {
    const data = await getJSON(API + '/filter.php?i=' + apiName(name));
    return data && data.meals ? data.meals : [];
  }

  // Convert TheMealDB's strIngredient1..20 / strMeasure1..20 into a clean list.
  function normalizeMeal(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = (meal['strIngredient' + i] || '').trim();
      const measure = (meal['strMeasure' + i] || '').trim();
      if (ing) ingredients.push({ name: ing, measure });
    }
    const steps = (meal.strInstructions || '')
      .split(/\r?\n+|(?<=\.)\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);

    return {
      id: meal.idMeal,
      title: meal.strMeal,
      category: meal.strCategory || '',
      area: meal.strArea || '',
      thumb: meal.strMealThumb || '',
      youtube: meal.strYoutube || '',
      source: meal.strSource || '',
      ingredients,
      steps,
    };
  }

  async function lookupMeal(id) {
    if (detailCache.has(id)) return detailCache.get(id);
    const data = await getJSON(API + '/lookup.php?i=' + encodeURIComponent(id));
    if (!data || !data.meals || !data.meals[0]) {
      throw new Error('Recipe not found');
    }
    const recipe = normalizeMeal(data.meals[0]);
    detailCache.set(id, recipe);
    return recipe;
  }

  /* Main entry: given ingredient names, return ranked + enriched recipes.
   * Each returned recipe has `.matchCount` and `.matched` (the user's
   * ingredients it uses). Sorted by best match, then "easiest" (fewest total
   * ingredients) as the tie-breaker. */
  async function search(names) {
    const unique = Array.from(new Set(names.map((n) => n.toLowerCase().trim()).filter(Boolean)));
    if (unique.length === 0) return [];

    // Fetch stubs for every ingredient in parallel; ignore individual failures.
    const settled = await Promise.allSettled(unique.map((n) => filterByIngredient(n)));

    // Tally: idMeal -> { stub, matched:Set }
    const tally = new Map();
    settled.forEach((result, idx) => {
      if (result.status !== 'fulfilled') return;
      const ingredient = unique[idx];
      result.value.forEach((stub) => {
        let entry = tally.get(stub.idMeal);
        if (!entry) {
          entry = { stub, matched: new Set() };
          tally.set(stub.idMeal, entry);
        }
        entry.matched.add(ingredient);
      });
    });

    if (tally.size === 0) return [];

    const ranked = Array.from(tally.values())
      .sort((a, b) => b.matched.size - a.matched.size)
      .slice(0, MAX_CANDIDATES);

    // Enrich top candidates with full details (parallel, failures dropped).
    const details = await Promise.allSettled(ranked.map((r) => lookupMeal(r.stub.idMeal)));

    const recipes = [];
    details.forEach((d, i) => {
      if (d.status !== 'fulfilled') return;
      const recipe = d.value;
      recipe.matched = Array.from(ranked[i].matched);
      recipe.matchCount = recipe.matched.length;
      recipes.push(recipe);
    });

    // Best match first; "easiest" (fewest ingredients) breaks ties.
    recipes.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.ingredients.length - b.ingredients.length;
    });

    return recipes;
  }

  return { search, lookupMeal, filterByIngredient, normalizeMeal };
})();
