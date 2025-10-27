const messages = {
  zh: {
    title: 'AutoAim Waves',
    subtitle: '竖屏固定点射击\n自动锁敌 · 局内升级 · 波次突围',
    start: '开始游戏',
    settings: '设置',
    shop: '商店',
    quit: '退出',
    achievements: '成就',
    pause: '暂停',
    resume: '继续',
    chooseSkill: '选择一个技能',
    shield: '护盾',
    drones: '无人机',
    aoe: '范围爆破'
  },
  en: {
    title: 'AutoAim Waves',
    subtitle: 'Fixed-point shooter\nAuto aim · Skills · Waves',
    start: 'Start',
    settings: 'Settings',
    shop: 'Shop',
    quit: 'Quit',
    achievements: 'Achievements',
    pause: 'Pause',
    resume: 'Resume',
    chooseSkill: 'Pick a Skill',
    shield: 'Shield',
    drones: 'Drones',
    aoe: 'AOE Blast'
  }
};

export const t = (key, locale = 'zh') => messages[locale]?.[key] ?? messages.zh[key] ?? key;
