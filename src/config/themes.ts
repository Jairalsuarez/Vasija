// Joint account card themes
export interface ThemeConfig {
  id: string;
  label: string;
  bg: string;
  text: string;
  accent: string;
}

export const JOINT_ACCOUNT_THEMES: ThemeConfig[] = [
  { id: 'purple', label: 'Púrpura', bg: 'bg-purple-600', text: 'text-white', accent: 'bg-purple-400/30' },
  { id: 'pink', label: 'Rosa', bg: 'bg-pink-600', text: 'text-white', accent: 'bg-pink-400/30' },
  { id: 'blue', label: 'Azul', bg: 'bg-blue-600', text: 'text-white', accent: 'bg-blue-400/30' },
  { id: 'green', label: 'Verde', bg: 'bg-green-600', text: 'text-white', accent: 'bg-green-400/30' },
  { id: 'orange', label: 'Naranja', bg: 'bg-orange-600', text: 'text-white', accent: 'bg-orange-400/30' },
  { id: 'teal', label: 'Verde agua', bg: 'bg-teal-600', text: 'text-white', accent: 'bg-teal-400/30' },
  { id: 'red', label: 'Rojo', bg: 'bg-red-600', text: 'text-white', accent: 'bg-red-400/30' },
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-600', text: 'text-white', accent: 'bg-indigo-400/30' },
  { id: 'amber', label: 'Ámbar', bg: 'bg-amber-600', text: 'text-white', accent: 'bg-amber-400/30' },
  { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-600', text: 'text-white', accent: 'bg-emerald-400/30' },
];

export function getTheme(id?: string): ThemeConfig {
  return JOINT_ACCOUNT_THEMES.find((t) => t.id === id) || JOINT_ACCOUNT_THEMES[0];
}

// App-wide theme presets — each defines the 3 core brand colors
export interface AppThemeConfig {
  id: string;
  name: string;
  primary: string;      // Main brand color (buttons, topbar, links)
  secondary: string;    // Secondary accent (toggles, highlights)
  topbar: string;       // TopBar background gradient start
  accent: string;       // Subtle page/card background tint (light mode)
  cardBorder: string;   // Card border color (light mode)
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (num & 0x0000ff) + amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = num >> 16;
  const g = (num >> 8) & 0x00ff;
  const b = num & 0x0000ff;
  return `rgba(${r},${g},${b},${alpha})`;
}

type ThemeGender = 'male' | 'female' | 'unspecified' | string | null | undefined;

function resolveTheme(themeId: string | null | undefined, isCouple: boolean, gender?: ThemeGender): AppThemeConfig {
  if (isCouple) return COUPLE_THEME;
  if (themeId) return APP_THEMES.find((a) => a.id === themeId) || genderTheme(gender);
  return genderTheme(gender);
}

function genderTheme(gender?: ThemeGender): AppThemeConfig {
  if (gender === 'male') return MALE_APP_THEME;
  if (gender === 'female') return FEMALE_APP_THEME;
  return NEUTRAL_APP_THEME;
}

export function getAppThemeCSS(themeId: string | null | undefined, isCouple: boolean, gender?: ThemeGender): Record<string, string> {
  const t = resolveTheme(themeId, isCouple, gender);
  const p = t.primary;
  const s = t.secondary;
  const a = t.accent;

  // Light mode
  const light: Record<string, string> = {
    '--theme-bg': '#ffffff',
    '--theme-card-bg': '#ffffff',
    '--theme-card-bg-alt': t.accent,
    '--theme-card-border': t.cardBorder,
    '--theme-text-primary': '#0f172a',
    '--theme-text-secondary': '#64748b',
    '--theme-text-muted': '#94a3b8',
    '--theme-primary': p,
    '--theme-primary-hover': darken(p, 30),
    '--theme-primary-light': hexToRgba(p, 0.08),
    '--theme-primary-text': '#ffffff',
    '--theme-secondary': s,
    '--theme-secondary-hover': darken(s, 30),
    '--theme-secondary-light': hexToRgba(s, 0.08),
    '--theme-topbar': isCouple ? `linear-gradient(135deg, ${p}, ${s})` : t.topbar,
    '--theme-accent': a,
    '--theme-border': '#f1f5f9',
    '--theme-input-bg': '#ffffff',
    '--theme-input-border': '#e2e8f0',
    '--theme-input-focus-ring': hexToRgba(p, 0.15),
    '--theme-ring': p,
    '--theme-icon': '#94a3b8',
    '--theme-hover': '#f8fafc',
    '--theme-toggle-bg': s,
    '--theme-toggle-icon': '#ffffff',
    '--theme-danger': '#ef4444',
    '--theme-success': '#22c55e',
    '--theme-warning': '#f59e0b',
  };

  return light;
}

export function getAppThemeDarkCSS(themeId: string | null | undefined, isCouple: boolean, gender?: ThemeGender): Record<string, string> {
  const t = resolveTheme(themeId, isCouple, gender);
  const p = t.primary;
  const s = t.secondary;

  // For dark mode, brighten and saturate the colors to make them glow beautifully
  const primaryBright = lighten(p, 45);
  const secondaryBright = lighten(s, 45);

  const bg = isCouple ? '#101424' : gender === 'female' ? '#1a1118' : gender === 'male' ? '#0f1724' : '#111827';
  const card = isCouple ? '#171c2f' : gender === 'female' ? '#241722' : gender === 'male' ? '#172235' : '#1b2430';
  const cardAlt = isCouple ? '#20263b' : gender === 'female' ? '#2d1d2b' : gender === 'male' ? '#1e2c42' : '#243142';

  const dark: Record<string, string> = {
    '--theme-bg': bg,
    '--theme-card-bg': card,
    '--theme-card-bg-alt': cardAlt,
    '--theme-card-border': hexToRgba(primaryBright, 0.18),
    '--theme-text-primary': '#f8fafc',
    '--theme-text-secondary': '#94a3b8',
    '--theme-text-muted': '#64748b',
    '--theme-primary': primaryBright,
    '--theme-primary-hover': lighten(primaryBright, 20),
    '--theme-primary-light': hexToRgba(primaryBright, 0.12),
    '--theme-primary-text': '#ffffff',
    '--theme-secondary': secondaryBright,
    '--theme-secondary-hover': lighten(secondaryBright, 20),
    '--theme-secondary-light': hexToRgba(secondaryBright, 0.12),
    '--theme-topbar': isCouple ? `linear-gradient(135deg, ${hexToRgba(primaryBright, 0.22)}, ${hexToRgba(secondaryBright, 0.22)})` : '#0f1624',
    '--theme-accent': hexToRgba(primaryBright, 0.1),
    '--theme-border': hexToRgba(primaryBright, 0.16),
    '--theme-input-bg': cardAlt,
    '--theme-input-border': hexToRgba(primaryBright, 0.22),
    '--theme-input-focus-ring': hexToRgba(primaryBright, 0.25),
    '--theme-ring': primaryBright,
    '--theme-icon': '#64748b',
    '--theme-hover': hexToRgba(primaryBright, 0.1),
    '--theme-toggle-bg': secondaryBright,
    '--theme-toggle-icon': '#ffffff',
    '--theme-danger': '#f87171',
    '--theme-success': '#34d399',
    '--theme-warning': '#fbbf24',
  };

  return dark;
}

export const APP_THEMES: AppThemeConfig[] = [
  { id: 'lavender', name: 'Lavanda', primary: '#7c3aed', secondary: '#ec4899', topbar: '#7c3aed', cardBorder: '#e9d5ff', accent: '#f5f3ff' },
  { id: 'rose', name: 'Rosa', primary: '#e11d48', secondary: '#f43f5e', topbar: '#e11d48', cardBorder: '#fecdd3', accent: '#fff1f2' },
  { id: 'ocean', name: 'Océano', primary: '#2563eb', secondary: '#06b6d4', topbar: '#2563eb', cardBorder: '#bfdbfe', accent: '#eff6ff' },
  { id: 'emerald', name: 'Esmeralda', primary: '#059669', secondary: '#10b981', topbar: '#059669', cardBorder: '#a7f3d0', accent: '#ecfdf5' },
  { id: 'sunset', name: 'Atardecer', primary: '#ea580c', secondary: '#f59e0b', topbar: '#ea580c', cardBorder: '#fed7aa', accent: '#fff7ed' },
  { id: 'slate', name: 'Pizarra', primary: '#475569', secondary: '#64748b', topbar: '#475569', cardBorder: '#cbd5e1', accent: '#f8fafc' },
];

export const MALE_APP_THEME: AppThemeConfig = {
  id: 'male-blue',
  name: 'Azul',
  primary: '#0b59b3',
  secondary: '#2563eb',
  topbar: '#0b59b3',
  cardBorder: '#bfdbfe',
  accent: '#eff6ff',
};

export const FEMALE_APP_THEME: AppThemeConfig = {
  id: 'female-rose',
  name: 'Rosa',
  primary: '#e35695',
  secondary: '#db2777',
  topbar: '#e35695',
  cardBorder: '#fbcfe8',
  accent: '#fdf2f8',
};

export const NEUTRAL_APP_THEME: AppThemeConfig = {
  id: 'neutral',
  name: 'Neutro',
  primary: '#334155',
  secondary: '#64748b',
  topbar: '#ffffff',
  cardBorder: '#e2e8f0',
  accent: '#ffffff',
};

export const COUPLE_THEME: AppThemeConfig = {
  id: 'couple',
  name: 'Pareja',
  primary: '#3b82f6',
  secondary: '#ec4899',
  topbar: '#3b82f6',
  cardBorder: '#bfdbfe',
  accent: '#eff6ff',
};

export function getAppTheme(id?: string | null, isCouple?: boolean): AppThemeConfig {
  return resolveTheme(id, !!isCouple);
}

export function getAppThemeForProfile(id?: string | null, isCouple?: boolean, gender?: ThemeGender): AppThemeConfig {
  return resolveTheme(id, !!isCouple, gender);
}
