# Changelog
All notable changes to this project will be documented in this file.

This format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 
and uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

---

## [v6.1.0] - 2025-01-XX

### Added
- **装备系统**: 完整的装备机制，含 4 个槽位（Weapon/Core/Module/Charm）和 4 种稀有度（Common/Rare/Epic/Legend）。
- **装备词缀**: 10 种词缀类型（固定伤害/总伤乘区/攻速/穿透/反弹/分裂小弹/AOE/无人机/护盾 CD/掉落）。
- **装备掉落**: 基础 12% 掉率，精英 +18%，Boss 保底 60%。
- **锻造与分解**: 使用残片合成随机装备或重铸词缀。
- **自动分解**: 可设置自动分解 Common 等低稀有度装备。
- **数值融合**: 装备词缀与技能/商店并行，有上限约束（攻速下限、穿透/反弹层数、伤害乘区 30%）。
- **equipment_config.json**: 装备配置文件，含 i18n 支持。

### Changed
- **EquipmentSystem**: 处理装备生成、掉落、穿戴、分解、锻造与数值融合。
- **GameScene**: 集成装备系统，在 handleEnemyKilled 中触发掉落。

### Fixed
- 装备掉落不会破坏现有掉落系统（能量球/金币）。
- 装备数值与技能数值正确合并，有上限保护。

### Performance
- 装备数值缓存，只在穿戴/卸下时重算。

### QA
- **装备掉落回归**: 1000 次击杀统计稀有度概率。
- **锻造概率**: 10^3 次合成统计。
- **上限压力**: 穿戴极端装备验证 clamp 生效。
- **背包性能**: 24 满载 FPS (P50/P95)。

### Migration
- **v6→v6.1 存档迁移**:
  - 新增 GameState.equipment 字段。
  - 装备数值自动计算并合并到角色属性。

---

## [v6.0.0] - 2025-01-XX

### Added
- **嵌套暂停计数**: PauseSystem 支持多原因暂停（panel/tutorial/boss/blur），避免误恢复。
- **每日试炼系统**: 基于日期生成 1~2 条规则（高密度/弱穿透/强反弹等）。
- **卡池加权与保底**: 技能抽卡记录距上次抽中轮数，多轮未出现时加权。
- **无障碍系统**: 高对比度模式、色盲友好调色、屏幕震动控制、命中反馈。
- **回放系统**: 记录 RNG 种子与关键事件，60s 窗口重放与分享码导出。
- **skill_config.json v6 配置**: 添加 dailyChallenge/gachaWeights/accessibility/replay 配置。

### Changed
- **PauseSystem**: 嵌套暂停计数，支持 reason 参数追踪暂停原因。
- **SkillSystem**: 加权抽取，未被抽中的技能轮数 +1，保底加权。
- **GameScene**: 集成每日试炼、无障碍、回放系统。
- **handleBlur/handleFocus**: 使用 reason='blur' 参数。

### Fixed
- **计时器竞态**: 确保 fireCooldown/WaveTimer 不会重复启动。
- **暂停嵌套**: 多个面板/事件同时暂停时不会误恢复。

### Performance
- 每日试炼规则只在开局时应用一次。
- 回放事件限制 1000 条，超过60s 自动停止。

### QA
- **暂停嵌套测试**: 同时打开多个面板验证计数。
- **每日试炼验证**: 同一日期规则一致。
- **卡池加权测试**: 100 次抽卡验证保底机制。
- **回放分享码**: 导出/加载一致性。

### Migration
- **v5→v6 存档迁移**:
  - 新增 GameState.skillGacha 字段记录抽卡统计。
  - 配置文件自动升级到 v6.1。

---

## [v5.0.0] - 2025-01-XX

### Added
- **Healer 精英词缀**: 周期性为附近小怪恢复 HP，有 CD 与单波上限(3次)，绿色闪烁视觉反馈。
- **Boss 扩展技能**: 
  - Phase 1 (<70% HP): 环形弹幕
  - Phase 2 (<40% HP): 扇形弹幕（5发朝向玩家） + 冲锋攻击（0.5s前摇黄色预警）
- **Boss 紫色宝箱**: 击杀 Boss 后掉落 2选 1 技能卡，不消耗普通升级次数。
- **护盾无敌帧**: 护盾被击穿后触发 0.5s 无敌（仅对子弹），黄色闪烁提示。
- **无人机 AI 切换**: QA 面板添加 DroneAI 按钮，切换自动瞪准/固定环绕模式。
- **无人机子弹寿命优化**: 从 2s 降至 1.2s，减少满屏干扰。
- **RNG 种子重放**: QA 面板 RNG 按钮，60s 记录分数/波次/击杀增量与 FPS 数据。
- **技能抽卡优化**: 未满级池不放回抽取，满级项填充并灰置。

### Changed
- **BossSystem**: 根据阶段动态释放技能（环形/扇形/冲锋）。
- **EliteSystem**: 新增 Healer 词缀，波次推进时重置治疗次数。
- **WaveSystem**: 通知 EliteSystem.onWaveAdvance()。
- **skill_config.json**: 更新为 v5，添加 Healer 词缀与 Boss 扩展配置。
- **VERSION**: 4.0.0 → 5.0.0。

### Fixed
- 技能面板抽卡重复/满级池问题（三选一现为不放回）。
- Boss 冲锋后未恢复速度问题（增加 0.8s 延迟恢复）。

### Performance
- 无人机子弹寿命从 2s 降至 1.2s，减少对象池压力。
- EliteSystem.update() 只处理活跃的 Healer 精英。

### QA
- **Scenarios**:
  - Spawn50: 验证 50 敌人同屏 FPS。
  - LevelUpTo10: 验证 fireRate 下限。
  - SpreadTest: 验证 scatter×multi max()。
  - BossChestTest: 验证 Boss 宝箱 2选 1。
  - HealerEliteTest: 验证 Healer 治疗 CD 与 cap。
  - DroneAITest: 验证 AI 切换功能。
  - RNGReplayTest: 验证 60s 数据记录。
- **Assertions**:
  - fireRate ≥ minFireRate: PASS
  - 技能抽卡不重复: PASS
  - Boss 每 5 波触发: PASS
  - Boss 宝箱 2 选项: PASS
  - Healer 单波上限 3 次: PASS
  - 护盾击穿 0.5s 无敌: PASS
  - 无人机子弹 ≤1.2s: PASS
  - RNG 重放 60s 记录: PASS

### Migration
- **v4→v5 存档迁移**:
  - 配置文件自动升级到 v5。
  - 新增 Healer 词缀不影响现有词缀池。
  - Boss 扩展配置向后兼容。

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
