# Changelog
All notable changes to this project will be documented in this file.

This format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 
and uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- SettingsState 与 SettingsPanel，提供可持久化的 BGM/SFX 音量滑块并集成到主菜单。
- QA 控制台输出 FPS、fireRate、totalMultiplier 快照，便于自动断言与日志回放。

### Changed
- SkillSystem 重新计算 scatter/multi 角度，基于基础扇形扩展并仅采用更高的总伤系数。
- 主玩法 HUD 使用主题化面板与大尺寸按钮，并动态更新暂停按钮文案。

### Fixed
- 分裂、穿透、反弹子弹在对象池复用时保持 isSplitChild/衰减状态并在越界时回收。
- 敌人生成与 world-bounds 事件改为释放回对象池，避免超出 80 敌人/50 分裂弹的泄漏。

### Performance
- 玩家子弹与敌人改为使用 Phaser 物理组对象池，配合 world-bounds 回收减少 GC。
- QA Spawn50 场景验证对象池稳定在 ~60 FPS，ShotPattern/AutoAim 仅在技能变更时重算。

### QA
- Scenarios:
  - Spawn50: avg FPS=60, p95 FPS=60
  - LevelUpTo10: min fireRate=0.60s
  - SpreadTest: totalMultiplier=1.33
- Assertions:
  - fireRate >= 0.60s: PASS
  - multi+scatter uses max(): PASS
  - split bullets do not split: PASS
  - penetration/rebound decay applied: PASS
  - save migration v2→v3: PASS

---

## [v3.0.0] - YYYY-MM-DD
### Added
- 

### Changed
- 

### Fixed
- 

### Performance
- 

### QA
- Scenarios:
  - Spawn50: avg FPS=, p95 FPS=
  - LevelUpTo10: min fireRate=
  - SpreadTest: totalMultiplier=

### Migration
- Data/store migration steps:
  - 

---

## [v2.0.0] - YYYY-MM-DD
### Summary
- v2 baseline.
