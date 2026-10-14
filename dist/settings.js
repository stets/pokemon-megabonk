const KEY = 'pokebonk-settings';
export const DEFAULT_SETTINGS = Object.freeze({ invertX: false, invertY: false, sensitivity: 1 });

export function normalizeSettings(value) {
  return {
    invertX: value?.invertX === true,
    invertY: value?.invertY === true,
    sensitivity: typeof value?.sensitivity === 'number' && Number.isFinite(value.sensitivity)
      ? Math.max(.35, Math.min(2, value.sensitivity)) : 1,
  };
}

export function loadSettings(storage) {
  try { return normalizeSettings(JSON.parse(storage.getItem(KEY))); }
  catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(storage, settings) {
  try { storage.setItem(KEY, JSON.stringify(normalizeSettings(settings))); } catch {}
}
