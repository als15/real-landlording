import type { ThemeConfig } from 'antd';

// Real Landlording brand colors based on reallandlording.com
export const brandColors = {
  // Primary - Dark charcoal (from WordPress site buttons)
  primary: '#32373c',
  primaryHover: '#23282d',
  primaryActive: '#1d2124',

  // Accent - Gold/Amber (warmth, real estate feel)
  accent: '#d4a847',
  accentHover: '#c49a3d',
  accentLight: '#f5e6c8',

  // Secondary - Warm earth tones
  secondary: '#8b7355',

  // Success, Warning, Error
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',

  // Neutrals
  white: '#ffffff',
  background: '#f8f7f5', // Warm off-white
  backgroundDark: '#32373c',
  border: '#e8e5e0',
  textPrimary: '#32373c',
  textSecondary: '#666666',
  textLight: '#999999',
};

export const theme: ThemeConfig = {
  token: {
    // Primary colors
    colorPrimary: brandColors.primary,
    colorPrimaryHover: brandColors.primaryHover,
    colorPrimaryActive: brandColors.primaryActive,

    // Link colors
    colorLink: brandColors.primary,
    colorLinkHover: brandColors.accent,

    // Success/Warning/Error
    colorSuccess: brandColors.success,
    colorWarning: brandColors.warning,
    colorError: brandColors.error,

    // Background
    colorBgContainer: brandColors.white,
    colorBgLayout: brandColors.background,

    // Border
    colorBorder: brandColors.border,
    colorBorderSecondary: '#f0ece6',

    // Typography
    colorText: brandColors.textPrimary,
    colorTextSecondary: brandColors.textSecondary,
    colorTextTertiary: brandColors.textLight,

    // Border radius - slightly softer
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // Font
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,

    // Sizing
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
  },
  components: {
    Button: {
      primaryShadow: '0 2px 8px rgba(50, 55, 60, 0.15)',
      defaultBorderColor: brandColors.border,
      algorithm: true,
    },
    Card: {
      boxShadowTertiary: '0 1px 3px rgba(0, 0, 0, 0.08)',
    },
    Menu: {
      itemSelectedBg: brandColors.accentLight,
      itemSelectedColor: brandColors.primary,
      itemHoverBg: '#f5f3f0',
    },
    Table: {
      headerBg: '#fafaf8',
      headerColor: brandColors.textPrimary,
      rowHoverBg: '#fdfcfb',
    },
    Input: {
      activeBorderColor: brandColors.primary,
      hoverBorderColor: brandColors.secondary,
    },
    Select: {
      optionSelectedBg: brandColors.accentLight,
    },
    Layout: {
      headerBg: brandColors.white,
      siderBg: brandColors.white,
      bodyBg: brandColors.background,
    },
    Steps: {
      colorPrimary: brandColors.accent,
    },
  },
};

export default theme;
