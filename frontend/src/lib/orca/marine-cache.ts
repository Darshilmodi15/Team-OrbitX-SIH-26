/** Public marine results still reveal a selected location; clear them at account boundaries. */
export function clearMarineCaches() {
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[storageName];
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key?.startsWith("orca.marine.cache.")) storage.removeItem(key);
      }
    } catch { /* Storage can be denied; authentication cleanup must continue. */ }
  }
}
