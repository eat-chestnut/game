# Changelog
All notable changes to this project will be documented in this file.

This format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 
and uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

---

## [v4.0.0] - 2025-01-XX

### Added
- **BossSystem**: 每 5 波生成 Boss，高 HP、环形弹幕、阶段切换（<70% / <40% HP）。
- **EliteSystem**: 精英敌人词缀（Fast/Thick/Splitter/Resistant），12% 生成概率。
- **TutorialSystem**: 首次运行四步引导，可持久化且可在设置中重置。
- **ShopSystem**: 永久升级系统（伤害+8%、攻速上限突破、掉落+3%），金币跨局积累。
- **ShopPanel**: 商店 UI 面板，集成到主菜单。
- **QAConsole 增强**: 数值观察模式、RNG 种子、自动性能降级检测（P95 < 50 FPS）。
- Boss 血条 HUD，阶段提示 Toast。
- 精英/Boss 击杀额外奖励（金币、经验、保底掉落）。

### Changed
- **SaveManager**: v3→v4 迁移，新增 `tutorialCompleted` 与 `shop` 字段。
- **GameState**: 新增 `shopDamageMultiplier` 与 `shopLootChanceBonus`。
- **PauseSystem**: 计时器去重守护，避免重复注册；状态幂等检查避免重复操作。
- **WaveSystem**: 集成 Boss 波次判定与延迟生成逻辑。
- **LootDropSystem**: 支持商店掉落概率加成，增加保底掉落 `guaranteedDrop`。
- **SkillSystem**: 伤害计算包含商店加成。
- **GameScene**: 集成所有 v4 系统，应用商店加成，支持精英抗性与 Boss AOE 衰减。
- **VERSION**: 2.1.0 → 4.0.0。

### Fixed
- 暂停竞态与计时器重复注册问题（通过 Set 去重）。
- 场景切换/浏览器失焦后恢复时，AudioContext 自动恢复 BGM。
- Boss 弹幕超界自动清理，避免溢出。
- Boss/精英不算漏怪（Boss 离开屏幕算逃脱失败）。
- 技能面板关闭后清理计时器，避免半挂起状态。

### Performance
- **自动性能降级**: P95 FPS < 50 时自动启用 `lowPowerMode`（粒子与拖尾 50%）。
- **对象池复用**: 子弹/敌人优先复用，减少 GC 峰值。
- **分帧创建**: Boss 弹幕生成延迟触发，避免尖刺。

### QA
- **Scenarios**:
  - Spawn50: 验证 50 敌人同屏时 FPS 稳定。
  - LevelUpTo10: 验证 fireRate 不突破 minFireRate (0.60s 或商店购买后 0.55s)。
  - SpreadTest: 验证连发×散射取 max() 而非相乘。
  - StressWave: 80 敌人压力测试。
  - TouchTest: 模拟触摸连点暂停/继续。
- **Assertions**:
  - fireRate ≥ minFireRate: PASS
  - multi+scatter 使用 max(): PASS
  - 分裂子弹不继续分裂: PASS
  - 穿透/反弹衰减生效: PASS
  - v2→v3→v4 存档迁移: PASS
  - Boss 每 5 波触发: PASS
  - Boss 死亡保底掉落: PASS
  - P95 FPS 自动降级: PASS

### Migration
- **v3→v4 存档迁移**:
  - 自动识别 v3/v2 版本，回填 `tutorialCompleted: false` 与 `shop` 默认值。
  - 保留所有现有 skillState/achievements/coins/locale。
  - 控制台输出迁移日志。
- **JSON 容错**:
  - skill_config.json 解析失败时回退到内置默认配置并继续运行。

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
