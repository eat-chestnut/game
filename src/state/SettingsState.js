const STORAGE_KEY = 'autoAim_waves_settings_v2';
const defaults = {
  musicVolume: 0.6,
  sfxVolume: 0.8
};

export const SettingsState = {
  values: { ...defaults },
  load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        this.values.musicVolume = clamp(saved.musicVolume, 0, 1, defaults.musicVolume);
        this.values.sfxVolume = clamp(saved.sfxVolume, 0, 1, defaults.sfxVolume);
      }
    } catch (err) {
      console.warn('SettingsState load failed', err);
      this.values = { ...defaults };
    }
  },
  save() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch (err) {
      console.warn('SettingsState save failed', err);
    }
  },
  set(key, value) {
    if (!(key in this.values)) return;
    this.values[key] = clamp(value, 0, 1, this.values[key]);
    this.save();
  }
};

function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isFinite(num)) return Math.min(Math.max(num, min), max);
  return fallback;
}
