# Equipment Sets — Design & Tuning Guide (v7)

This document describes the **set bonuses** used by the equipment system (v6.1+) and the
new v7 features. It is written for Windsurf Codex to implement UI, logic, and QA.
If there is a mismatch between code and this doc, **treat this doc as the source of truth**
and refactor code accordingly.

> Hard gameplay constraints remain in effect at all times:
> - Fire-rate floor: `fireRate >= max(minFireRate, capFireRate)` (0.60s default, 0.55s with shop upgrade).
> - Multi × Scatter: use `max()` (never multiply together).
> - Split children never split; inherit only numeric multipliers; base = 60% (plus equip bonus, capped).
> - Penetration decay ×0.90 (min 50%); Rebound decay ×0.85 (±4° jitter).


## 1) Set Catalog

All sets can appear on any slot unless specified by loot tables. Activation is by the number
of distinct pieces worn **with the same `setId`**:

- **2 pieces** → `set2` effects active
- **4 pieces** → `set2` and `set4` effects active

| Set ID    | Localized Name | 2‑Piece Bonus (`set2`)                  | 4‑Piece Bonus (`set4`)                                                                 | Notes |
|-----------|-----------------|-----------------------------------------|----------------------------------------------------------------------------------------|------|
| `Hunter`  | 猎手 / Hunter   | `bulletSpeedPct: +10`                   | `penetrationPlus: +1`, `penetrationDecayMul: 0.92` (still bounded by 50% min damage)  | Does **not** bypass global caps (penetration ≤ 3). |
| `Arcanist`| 奥术 / Arcanist | `damageMulPct: +8`                      | `aoeScalePct: +12`, `aoeCooldownPct: -10`                                             | Affects AOE skill only; keep boss AOE modifier ×0.75. |
| `Vanguard`| 先锋 / Vanguard | `hpMulPct: +12`                         | `shieldCDPct: -15`, `droneDmgPct: +10`                                                | Defensive hybrid; improves shield and drone lines. |
| `Tempest` | 风暴 / Tempest  | `fireRatePct: -6` (interval reduction)  | `damageMulPct: +10`, `splitChildPct: +10`                                             | Fire-rate is still clamped by global floor caps. |

> Localization:
> - `name.zh` and `name.en` are provided in the sets patch; Codex should render according to current i18n.
> - Missing keys must fallback to Chinese (`zh`).


## 2) Data Contract (equipment_config.json)

The sets live under the root key `sets`:

```jsonc
{
  "sets": {
    "Hunter": {
      "name": { "zh": "猎手", "en": "Hunter" },
      "set2": { "bulletSpeedPct": 10 },
      "set4": { "penetrationPlus": 1, "penetrationDecayMul": 0.92 }
    },
    "Arcanist": {
      "name": { "zh": "奥术", "en": "Arcanist" },
      "set2": { "damageMulPct": 8 },
      "set4": { "aoeScalePct": 12, "aoeCooldownPct": -10 }
    },
    "Vanguard": {
      "name": { "zh": "先锋", "en": "Vanguard" },
      "set2": { "hpMulPct": 12 },
      "set4": { "shieldCDPct": -15, "droneDmgPct": 10 }
    },
    "Tempest": {
      "name": { "zh": "风暴", "en": "Tempest" },
      "set2": { "fireRatePct": -6 },
      "set4": { "damageMulPct": 10, "splitChildPct": 10 }
    }
  }
}
```

Codex tasks:
1. If `equipment_config.json` lacks `sets`, **insert** this block.
2. If present, **merge** keys; do **not** remove existing fields.
3. Provide a `SetTracker` structure at runtime:
   ```json
   {
     "counts": {"Hunter":2, "Tempest":1, ...},
     "active": {"Hunter":{"set2":true,"set4":false}, ...}
   }
   ```


## 3) Runtime Fusion Order

Whenever equipment or skills change values, recalc a fusion cache in this order:

1. **Base** → `baseDamage`, `fireRate`, `bulletDamageMultiplier`, `penetration`, `rebound`, `splitChildScale=0.60`.
2. **Skills & Shop** → apply skill multipliers and shop caps (e.g., `FireRateCap`).
3. **Equipment Affixes** → add/multiply according to affix definitions; **clamp** by rules:
   - `damageMulPct` total from equipment ≤ **30%**
   - `penetrationPlus` ≤ **3**, `reboundPlus` ≤ **2**
   - `splitChildPct` bonus ≤ **+30%** → child cap is **78%** of parent base
   - Fire‑rate floor: `fireRate ≥ max(minFireRate, capFireRate)`
4. **Set Bonuses** → apply `set2` then `set4`; **never** break global caps.
5. **Shape Fusion** → multi vs scatter: `totalMultiplier = max(multiTotal, scatterTotal)`; distribute per‑bullet damage evenly.
6. Emit `ShotPattern` and `perBulletDamage` to AutoAim.


## 4) UI & UX

- **HUD** shows active set progress (e.g., `Hunter 2/4`).
- **EquipPanel**:
  - Each item card displays `setId`, localized name, and a small 2/4 progress bar.
  - Filter by `setId`, `rarity`, `slot`, and text keyword (i18n aware).
  - Bulk operations respect locked items; never autosalvage `Epic/Legend` by default.
- **Loadouts** show set progress per preset to help quick swapping.


## 5) QA Checklist

Must pass after implementation:

- Set activation toggles correctly when equipping/unequipping or switching Loadouts.
- All bonuses respect global clamps and **do not** stack beyond limits.
- AOE vs Boss modifier (×0.75) remains in effect.
- Fire‑rate floor remains ≥ 0.60s (or shop cap 0.55s if higher priority), even with `Tempest` set.
- Localization coverage for set names and tooltips is ≥ 100% (fall back to `zh` if missing).
- Performance with full inventory (24 items), set filtering, and scrolling keeps **P95 FPS ≥ 50** (auto low‑perf mode may engage).


## 6) Tuning Tips

- Start with conservative set values (already provided). If DPS spikes are detected:
  - Reduce `damageMulPct` on `Arcanist` or raise AOE cooldown.
  - Keep `penetrationDecayMul` ≥ 0.92 to avoid bypassing the 50% minimum damage rule.
  - Cap total bullet‑speed bonus to avoid off‑screen physics artifacts.
- Prefer **multiplicative over additive** when blending with existing multipliers to avoid runaway growth.


## 7) Changelog Hooks

When Codex finishes, append to `CHANGELOG.md`:

```
### Added
- Equipment Sets: Hunter, Arcanist, Vanguard, Tempest (2/4 piece bonuses, localized).

### Changed
- Fusion cache recalculation order updated; set bonuses now applied post‑affix and pre‑shape.

### QA
- Set activation & clamp assertions passing; P50/P95 FPS within acceptable bounds.
```

---

_Last updated for v7 build series._
