# AutoAim Waves

Vertical fixed-point shooter built with Phaser. Auto-aim bullets, roguelite skill drafts, wave escalation, loot buffs, QA automation and browser-friendly settings.

## Gameplay
- Portrait 720x1600 canvas with adaptive HUD margins.
- Player fires automatically using AutoAim patterns (scatter/multi handled via max multiplier).
- Skill panel pauses the game and offers 3 non-repeating choices (including shields, drones, AOE blast).
- Wave timer increases enemy HP/speed/spawn rate every 30s.
- Shield layers absorb hits, drones orbit and shoot independently, and periodic AOE blasts clear packs.

## Systems & Persistence
- `skill_config.json` defines all balance knobs and v3 skills.
- Save data (level, coins, skills, achievements, toggles, locale) and audio settings persist via Storage with v2→v3 migration.
- Settings panel exposes BGM/SFX sliders, locale switch (ZH/EN), and low-power mode.
- Achievements panel surfaces best score, wave, kills, combos, and AOE triggers.

## QA & Testing
Use the in-game QA console buttons:
- `Spawn50`, `StressWave`, `Level10`, `SpreadTest`, `TouchTest`.
- Realtime metrics include FPS(avg/p50/p95), fireRate, shot count, total multiplier.

## Controls
- Tap/click anywhere to unlock audio, use HUD buttons (≥44px hit area) for pause/skills/settings.
- Long-press pause button or use the system focus events to halt/resume.

## Development
- Entry: `index.html`; scripts under `src/`.
- Run locally via `python3 -m http.server` or bundle with Parcel per `build.config.json`.
