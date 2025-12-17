import type { ThemeConfig } from 'antd';

// Real Landlording brand colors from reallandlording.com
export const brandColors = {
  // Primary - Forest Green (main brand color)
  primary: '#4b7557',
  primaryHover: '#3d6047',
  primaryActive: '#2f4a38',

  // Secondary - Slate Blue
  secondary: '#546a7b',
  secondaryHover: '#455a6a',

  // Accent - Gold/Tan
  accent: '#c9a76a',
  accentHover: '#b8965a',
  accentLight: '#e3d5b8',

  // Tertiary - Brick Red (for alerts, CTAs)
  tertiary: '#b85042',
  tertiaryHover: '#a54539',

  // Neutrals
  gray: '#717577',
  grayLight: '#d3d3d3',
  grayLightest: '#dce2de',

  // Success, Warning, Error
  success: '#4b7557', // Use primary green for success
  warning: '#c9a76a', // Use accent gold for warning
  error: '#b85042', // Use brick red for error

  // Core neutrals
  white: '#ffffff',
  background: '#f8f9f8', // Very light gray-green tint
  backgroundWarm: '#e3d5b8', // Warm tan background
  backgroundDark: '#546a7b', // Slate blue for dark sections
  border: '#dce2de',
  borderLight: '#e8ebe9',

  // Text colors
  textPrimary: '#2d3436',
  textSecondary: '#546a7b',
  textLight: '#717577',
  textOnDark: '#ffffff',
  textOnAccent: '#2d3436',
};

export const theme: ThemeConfig = {
  token: {
    // Primary colors - Forest Green
    colorPrimary: brandColors.primary,
    colorPrimaryHover: brandColors.primaryHover,
    colorPrimaryActive: brandColors.primaryActive,

    // Link colors
    colorLink: brandColors.primary,
    colorLinkHover: brandColors.primaryHover,

    // Success/Warning/Error
    colorSuccess: brandColors.success,
    colorWarning: brandColors.warning,
    colorError: brandColors.error,

    // Background
    colorBgContainer: brandColors.white,
    colorBgLayout: brandColors.background,

    // Border
    colorBorder: brandColors.border,
    colorBorderSecondary: brandColors.borderLight,

    // Typography
    colorText: brandColors.textPrimary,
    colorTextSecondary: brandColors.textSecondary,
    colorTextTertiary: brandColors.textLight,

    // Border radius - slightly rounded
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // Font - Poppins
    fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,

    // Sizing
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
  },
  components: {
    Button: {
      primaryShadow: '0 2px 8px rgba(75, 117, 87, 0.2)',
      defaultBorderColor: brandColors.border,
      algorithm: true,
    },
    Card: {
      boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.06)',
    },
    Menu: {
      itemSelectedBg: `${brandColors.primary}10`,
      itemSelectedColor: brandColors.primary,
      itemHoverBg: `${brandColors.primary}08`,
    },
    Table: {
      headerBg: brandColors.grayLightest,
      headerColor: brandColors.textPrimary,
      rowHoverBg: `${brandColors.primary}05`,
    },
    Input: {
      activeBorderColor: brandColors.primary,
      hoverBorderColor: brandColors.secondary,
    },
    Select: {
      optionSelectedBg: `${brandColors.primary}15`,
    },
    Layout: {
      headerBg: brandColors.white,
      siderBg: brandColors.white,
      bodyBg: brandColors.background,
    },
    Steps: {
      colorPrimary: brandColors.primary,
    },
    Tag: {
      defaultBg: brandColors.grayLightest,
    },
  },
};

export default theme;
