export const ThemeTokens = {
  color: {
    primary: '#6C5CE7',
    accent: '#00D1B2',
    bg: '#0F1222',
    panel: 'rgba(255,255,255,0.06)',
    panelStrong: 'rgba(255,255,255,0.12)',
    text: '#E9ECF1',
    textMuted: '#A7B0C0',
    danger: '#FF5C7A',
    success: '#29CC97'
  },
  radius: { sm: 8, md: 12, lg: 20 },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.25)',
    md: '0 8px 24px rgba(0,0,0,0.35)',
    lg: '0 16px 48px rgba(0,0,0,0.45)'
  },
  typography: {
    fontFamily: 'Inter, SF Pro, Roboto, system-ui',
    h1: { size: 28, weight: 700 },
    h2: { size: 22, weight: 700 },
    body: { size: 14, weight: 500 }
  },
  motion: { fast: 0.16, normal: 0.22, slow: 0.3 }
};

export const themeColor = value => Phaser.Display.Color.ValueToColor(value).color;

export function applyTheme(target, type, variant = 'panel') {
  if (!target || typeof target.setFillStyle !== 'function') return;
  switch (type) {
    case 'panel': {
      const color = variant === 'strong' ? ThemeTokens.color.panelStrong : ThemeTokens.color.panel;
      target.setFillStyle(themeColor(color));
      break;
    }
    case 'button': {
      const hex = variant === 'accent' ? ThemeTokens.color.accent : ThemeTokens.color.primary;
      target.setFillStyle(themeColor(hex), 1);
      break;
    }
    case 'text':
    default: {
      if (target.setColor) target.setColor(ThemeTokens.color.text);
      break;
    }
  }
}

export const UIFactoryDefaults = {
  buttonPadding: { x: 28, y: 16 },
  hoverScale: 1.03,
  pressScale: 0.98
};
