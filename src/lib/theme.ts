import { colors as brandColors } from '@/theme/colors';

export const colors = {
  ...brandColors,
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
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 14,
    color: colors.textSecondary,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  textStyles,
};
