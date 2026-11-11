export const theme = {
  color: {
    bg: '#0c0c10',
    surface: '#16161c',
    surfaceGlass: 'rgba(255,255,255,0.08)',
    text: '#ffffff',
    textDim: 'rgba(255,255,255,0.6)',
    accent: '#ff9f43',
    like: '#2ecc71',
    pass: '#ff6b6b',
  },
  radius: { sm: 8, md: 14, lg: 24, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  font: {
    family: { regular: 'System', medium: 'System', bold: 'System' },
    size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 },
  },
} as const;

export type Theme = typeof theme;
