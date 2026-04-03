import type { ThemeConfig } from 'antd';

// Brand colors using CSS variables - automatically adapts to light/dark mode
// These are used by components in inline styles
export const brandColors = {
  // Primary - Forest Green
  primary: 'var(--brand-primary)',
  primaryHover: 'var(--brand-primary-hover)',
  primaryActive: 'var(--brand-primary-active)',

  // Secondary - Slate Blue
  secondary: 'var(--brand-secondary)',
  secondaryHover: 'var(--brand-secondary-hover)',

  // Accent - Gold/Tan
  accent: 'var(--brand-accent)',
  accentHover: 'var(--brand-accent-hover)',
  accentLight: 'var(--brand-accent-light)',

  // Tertiary - Brick Red (for alerts, CTAs)
  tertiary: 'var(--brand-tertiary)',
  tertiaryHover: 'var(--brand-tertiary-hover)',

  // Neutrals
  gray: 'var(--brand-gray)',
  grayLight: 'var(--brand-gray-light)',
  grayLightest: 'var(--brand-gray-lightest)',

  // Success, Warning, Error
  success: 'var(--brand-success)',
  warning: 'var(--brand-warning)',
  error: 'var(--brand-error)',

  // Core neutrals
  white: 'var(--brand-white)',
  background: 'var(--brand-background)',
  backgroundWarm: 'var(--brand-background-warm)',
  backgroundDark: 'var(--brand-background-dark)',
  border: 'var(--brand-border)',
  borderLight: 'var(--brand-border-light)',

  // Text colors
  textPrimary: 'var(--brand-text-primary)',
  textSecondary: 'var(--brand-text-secondary)',
  textLight: 'var(--brand-text-light)',
  textOnDark: 'var(--brand-text-on-dark)',
  textOnAccent: 'var(--brand-text-on-accent)',

  // Opacity variants (used in some components)
  accentAlpha08: 'var(--brand-accent-alpha-08)',
  accentAlpha15: 'var(--brand-accent-alpha-15)',
  accentAlpha20: 'var(--brand-accent-alpha-20)',
};

// Static hex values for Ant Design theme config (needs actual values, not CSS vars)
const lightColors = {
  primary: '#4b7557',
  primaryHover: '#3d6047',
  primaryActive: '#2f4a38',
  secondary: '#546a7b',
  accent: '#c9a76a',
  accentHover: '#b8965a',
  success: '#4b7557',
  warning: '#c9a76a',
  error: '#b85042',
  white: '#ffffff',
  background: '#f8f9f8',
  border: '#dce2de',
  borderLight: '#e8ebe9',
  grayLightest: '#dce2de',
  textPrimary: '#2d3436',
  textSecondary: '#546a7b',
  textLight: '#717577',
};

const darkColors = {
  primary: '#5a9b6b',
  primaryHover: '#6baf7c',
  primaryActive: '#4b8a5c',
  secondary: '#7a9bb0',
  accent: '#d4b87a',
  accentHover: '#c9a76a',
  success: '#5a9b6b',
  warning: '#d4b87a',
  error: '#d4756a',
  white: '#1a1a2e',
  background: '#121220',
  border: '#2a2a40',
  borderLight: '#232338',
  grayLightest: '#2a2a40',
  textPrimary: '#e8e8ec',
  textSecondary: '#9a9ab0',
  textLight: '#6e6e88',
};

function buildTheme(colors: typeof lightColors): ThemeConfig {
  return {
    token: {
      colorPrimary: colors.primary,
      colorPrimaryHover: colors.primaryHover,
      colorPrimaryActive: colors.primaryActive,
      colorLink: colors.primary,
      colorLinkHover: colors.primaryHover,
      colorSuccess: colors.success,
      colorWarning: colors.warning,
      colorError: colors.error,
      colorBgContainer: colors.white,
      colorBgLayout: colors.background,
      colorBorder: colors.border,
      colorBorderSecondary: colors.borderLight,
      colorText: colors.textPrimary,
      colorTextSecondary: colors.textSecondary,
      colorTextTertiary: colors.textLight,
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
      fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },
    components: {
      Button: {
        primaryShadow: `0 2px 8px rgba(75, 117, 87, 0.2)`,
        defaultBorderColor: colors.border,
        algorithm: true,
      },
      Card: {
        boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      Menu: {
        itemSelectedBg: `${colors.primary}18`,
        itemSelectedColor: colors.primary,
        itemHoverBg: `${colors.primary}10`,
      },
      Table: {
        headerBg: colors.grayLightest,
        headerColor: colors.textPrimary,
        rowHoverBg: `${colors.primary}08`,
      },
      Input: {
        activeBorderColor: colors.primary,
        hoverBorderColor: colors.secondary,
      },
      Select: {
        optionSelectedBg: `${colors.primary}18`,
      },
      Layout: {
        headerBg: colors.white,
        siderBg: colors.white,
        bodyBg: colors.background,
      },
      Steps: {
        colorPrimary: colors.primary,
      },
      Tag: {
        defaultBg: colors.grayLightest,
      },
    },
  };
}

export const lightTheme = buildTheme(lightColors);
export const darkTheme = buildTheme(darkColors);

// Default export for backwards compatibility
export const theme = lightTheme;
export default theme;
