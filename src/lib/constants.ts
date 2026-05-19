export const COUNTRY_CODES = [
  { code: '+593', label: '🇪🇨 EC', country: 'Ecuador' },
  { code: '+57', label: '🇨🇴 CO', country: 'Colombia' },
  { code: '+51', label: '🇵🇪 PE', country: 'Perú' },
  { code: '+52', label: '🇲🇽 MX', country: 'México' },
] as const;

export const MOVEMENT_CATEGORIES = [
  'Salario',
  'Freelance',
  'Inversiones',
  'Alimentación',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Otro',
] as const;

export const COLORS = {
  male: {
    primary: '#2563EB',
    secondary: '#3B82F6',
    accent: '#60A5FA',
  },
  female: {
    primary: '#DB2777',
    secondary: '#EC4899',
    accent: '#F472B6',
  },
  unspecified: {
    primary: '#7C3AED',
    secondary: '#8B5CF6',
    accent: '#A78BFA',
  },
  couple: {
    primary: '#D97706',
    secondary: '#F59E0B',
    accent: '#FBBF24',
  },
} as const;

export const APP_VERSION = '1.0.0';
