export const colors = {
  primary: '#57C785',
  secondary: '#FFE490',
  dark: '#2B2B2B',
  background: '#FFFFFF',
  surface: '#F5F6F8',
  border: '#E5E7EB',
  text: '#1F2933',
  muted: '#6B7280',
  danger: '#EF4444',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const textStyles = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.dark,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.muted,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
  },
  caption: {
    fontSize: 14,
    color: colors.muted,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  textStyles,
};
