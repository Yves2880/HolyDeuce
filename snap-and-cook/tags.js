/* tags.js — single source of truth for the current ingredient list.
 *
 * Tags are stored normalized (lowercase, trimmed) and deduped. A tag added from
 * photo detection is flagged so the UI can style it differently. */

window.Tags = (function () {
  // name -> { detected: boolean }
  const tags = new Map();
  const listeners = [];

  function normalize(raw) {
    return String(raw || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  function emit() {
    listeners.forEach((fn) => fn(list()));
  }

  function add(raw, opts = {}) {
    const name = normalize(raw);
    if (!name) return false;
    const existing = tags.get(name);
    if (existing) {
      // Promote to "manual" confidence if user re-adds; keep detected flag only
      // if it was detected and not yet confirmed manually.
      if (!opts.detected) existing.detected = false;
      return false;
    }
    tags.set(name, { detected: !!opts.detected });
    emit();
    return true;
  }

  function addMany(names, opts = {}) {
    let added = 0;
    names.forEach((n) => {
      if (add(n, opts)) added++;
    });
    return added;
  }

  function remove(name) {
    if (tags.delete(normalize(name))) emit();
  }

  function list() {
    return Array.from(tags.entries()).map(([name, meta]) => ({
      name,
      detected: meta.detected,
    }));
  }

  function names() {
    return Array.from(tags.keys());
  }

  function count() {
    return tags.size;
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  return { add, addMany, remove, list, names, count, onChange, normalize };
})();
