/**
 * Design Tokens
 * 
 * Centralized design tokens for the HR Management Dashboard.
 * These tokens define all visual properties used throughout the application.
 * 
 * Usage:
 * - Import tokens in JavaScript: import { designTokens } from './theme/designTokens'
 * - Access via CSS variables: var(--color-primary-main)
 */

export const designTokens = {
  // Color Palette
  colors: {
    // Primary Colors
    primary: {
      main: '#007bff',
      light: '#4da3ff',
      dark: '#0056b3',
      contrastText: '#ffffff',
    },
    // Secondary Colors
    secondary: {
      main: '#6c757d',
      light: '#9ca3a8',
      dark: '#495057',
      contrastText: '#ffffff',
    },
    // Semantic Colors
    success: {
      main: '#28a745',
      light: '#5cb85c',
      dark: '#1e7e34',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc3545',
      light: '#e4606d',
      dark: '#bd2130',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffc107',
      light: '#ffcd39',
      dark: '#d39e00',
      contrastText: '#212529',
    },
    info: {
      main: '#17a2b8',
      light: '#45b5c6',
      dark: '#117a8b',
      contrastText: '#ffffff',
    },
    // Background Colors
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
    },
    // Text Colors
    text: {
      primary: '#212529',
      secondary: '#6c757d',
      disabled: '#adb5bd',
    },
    // Border Colors
    divider: '#dee2e6',
    border: '#dee2e6',
  },

  // Dark Mode Colors
  darkColors: {
    primary: {
      main: '#4da3ff',
      light: '#80bdff',
      dark: '#007bff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9ca3a8',
      light: '#c1c6ca',
      dark: '#6c757d',
      contrastText: '#ffffff',
    },
    success: {
      main: '#5cb85c',
      light: '#7ec87e',
      dark: '#28a745',
      contrastText: '#ffffff',
    },
    error: {
      main: '#e4606d',
      light: '#ea8089',
      dark: '#dc3545',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffcd39',
      light: '#ffd966',
      dark: '#ffc107',
      contrastText: '#212529',
    },
    info: {
      main: '#45b5c6',
      light: '#6dc5d3',
      dark: '#17a2b8',
      contrastText: '#ffffff',
    },
    background: {
      default: '#1a1d23',
      paper: '#25282e',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
    },
    text: {
      primary: '#f8f9fa',
      secondary: '#adb5bd',
      disabled: '#6c757d',
    },
    divider: '#495057',
    border: '#495057',
  },

  // Spacing System (8px base unit)
  spacing: {
    unit: 8,
    xs: '4px',    // 0.5 * unit
    sm: '8px',    // 1 * unit
    md: '16px',   // 2 * unit
    lg: '24px',   // 3 * unit
    xl: '32px',   // 4 * unit
    xxl: '48px',  // 6 * unit
    xxxl: '64px', // 8 * unit
  },

  // Border Radius
  borderRadius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    round: '50%',
    pill: '9999px',
  },

  // Shadows
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xxl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  // Typography
  typography: {
    fontFamily: {
      primary: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      mono: '"Fira Code", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      xxl: '1.5rem',    // 24px
      xxxl: '2rem',     // 32px
      xxxxl: '2.5rem',  // 40px
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
      loose: 2,
    },
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
      wider: '0.05em',
    },
  },

  // Breakpoints
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },

  // Z-Index
  zIndex: {
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },

  // Transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
};

/**
 * Generate CSS variables from design tokens
 * @param {boolean} isDark - Whether to use dark mode colors
 * @returns {object} CSS variables object
 */
export const generateCSSVariables = (isDark = false) => {
  const colors = isDark ? designTokens.darkColors : designTokens.colors;
  
  return {
    // Colors
    '--color-primary-main': colors.primary.main,
    '--color-primary-light': colors.primary.light,
    '--color-primary-dark': colors.primary.dark,
    '--color-primary-contrast': colors.primary.contrastText,
    
    '--color-secondary-main': colors.secondary.main,
    '--color-secondary-light': colors.secondary.light,
    '--color-secondary-dark': colors.secondary.dark,
    '--color-secondary-contrast': colors.secondary.contrastText,
    
    '--color-success-main': colors.success.main,
    '--color-success-light': colors.success.light,
    '--color-success-dark': colors.success.dark,
    '--color-success-contrast': colors.success.contrastText,
    
    '--color-error-main': colors.error.main,
    '--color-error-light': colors.error.light,
    '--color-error-dark': colors.error.dark,
    '--color-error-contrast': colors.error.contrastText,
    
    '--color-warning-main': colors.warning.main,
    '--color-warning-light': colors.warning.light,
    '--color-warning-dark': colors.warning.dark,
    '--color-warning-contrast': colors.warning.contrastText,
    
    '--color-info-main': colors.info.main,
    '--color-info-light': colors.info.light,
    '--color-info-dark': colors.info.dark,
    '--color-info-contrast': colors.info.contrastText,
    
    '--color-background-default': colors.background.default,
    '--color-background-paper': colors.background.paper,
    '--color-background-hover': colors.background.hover,
    '--color-background-selected': colors.background.selected,
    
    '--color-text-primary': colors.text.primary,
    '--color-text-secondary': colors.text.secondary,
    '--color-text-disabled': colors.text.disabled,
    
    '--color-divider': colors.divider,
    '--color-border': colors.border,
    
    // Spacing
    '--spacing-xs': designTokens.spacing.xs,
    '--spacing-sm': designTokens.spacing.sm,
    '--spacing-md': designTokens.spacing.md,
    '--spacing-lg': designTokens.spacing.lg,
    '--spacing-xl': designTokens.spacing.xl,
    '--spacing-xxl': designTokens.spacing.xxl,
    '--spacing-xxxl': designTokens.spacing.xxxl,
    
    // Border Radius
    '--border-radius-none': designTokens.borderRadius.none,
    '--border-radius-sm': designTokens.borderRadius.sm,
    '--border-radius-md': designTokens.borderRadius.md,
    '--border-radius-lg': designTokens.borderRadius.lg,
    '--border-radius-xl': designTokens.borderRadius.xl,
    '--border-radius-xxl': designTokens.borderRadius.xxl,
    '--border-radius-round': designTokens.borderRadius.round,
    '--border-radius-pill': designTokens.borderRadius.pill,
    
    // Shadows
    '--shadow-xs': designTokens.shadows.xs,
    '--shadow-sm': designTokens.shadows.sm,
    '--shadow-md': designTokens.shadows.md,
    '--shadow-lg': designTokens.shadows.lg,
    '--shadow-xl': designTokens.shadows.xl,
    '--shadow-xxl': designTokens.shadows.xxl,
    
    // Typography
    '--font-family-primary': designTokens.typography.fontFamily.primary,
    '--font-family-mono': designTokens.typography.fontFamily.mono,
    
    '--font-size-xs': designTokens.typography.fontSize.xs,
    '--font-size-sm': designTokens.typography.fontSize.sm,
    '--font-size-md': designTokens.typography.fontSize.md,
    '--font-size-lg': designTokens.typography.fontSize.lg,
    '--font-size-xl': designTokens.typography.fontSize.xl,
    '--font-size-xxl': designTokens.typography.fontSize.xxl,
    '--font-size-xxxl': designTokens.typography.fontSize.xxxl,
    '--font-size-xxxxl': designTokens.typography.fontSize.xxxxl,
    
    '--font-weight-light': designTokens.typography.fontWeight.light,
    '--font-weight-regular': designTokens.typography.fontWeight.regular,
    '--font-weight-medium': designTokens.typography.fontWeight.medium,
    '--font-weight-semibold': designTokens.typography.fontWeight.semibold,
    '--font-weight-bold': designTokens.typography.fontWeight.bold,
    '--font-weight-extrabold': designTokens.typography.fontWeight.extrabold,
    
    '--line-height-tight': designTokens.typography.lineHeight.tight,
    '--line-height-normal': designTokens.typography.lineHeight.normal,
    '--line-height-relaxed': designTokens.typography.lineHeight.relaxed,
    '--line-height-loose': designTokens.typography.lineHeight.loose,
  };
};

/**
 * Apply CSS variables to document root
 * @param {boolean} isDark - Whether to use dark mode colors
 */
export const applyCSSVariables = (isDark = false) => {
  const variables = generateCSSVariables(isDark);
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

/**
 * Spacing Utility Functions
 * 
 * Helper functions for consistent spacing throughout the application.
 * All spacing values are based on the 8px base unit.
 */

/**
 * Get spacing value by multiplier
 * @param {number} multiplier - Multiplier of the base unit (8px)
 * @returns {string} Spacing value in pixels
 * @example spacing(2) => '16px'
 */
export const spacing = (multiplier) => {
  return `${designTokens.spacing.unit * multiplier}px`;
};

/**
 * Get spacing value for multiple sides
 * @param {number|number[]} multipliers - Single multiplier or array of [top, right, bottom, left]
 * @returns {string} Spacing value(s) in pixels
 * @example spacingMultiple(2) => '16px'
 * @example spacingMultiple([1, 2, 1, 2]) => '8px 16px 8px 16px'
 */
export const spacingMultiple = (multipliers) => {
  if (typeof multipliers === 'number') {
    return spacing(multipliers);
  }
  
  if (Array.isArray(multipliers)) {
    return multipliers.map(m => spacing(m)).join(' ');
  }
  
  return spacing(0);
};

/**
 * Get spacing value by named size
 * @param {string} size - Named size (xs, sm, md, lg, xl, xxl, xxxl)
 * @returns {string} Spacing value in pixels
 * @example spacingBySize('md') => '16px'
 */
export const spacingBySize = (size) => {
  return designTokens.spacing[size] || designTokens.spacing.md;
};

/**
 * Get vertical spacing (top and bottom)
 * @param {number} multiplier - Multiplier of the base unit
 * @returns {object} Object with paddingTop and paddingBottom
 * @example spacingVertical(2) => { paddingTop: '16px', paddingBottom: '16px' }
 */
export const spacingVertical = (multiplier) => {
  const value = spacing(multiplier);
  return {
    paddingTop: value,
    paddingBottom: value,
  };
};

/**
 * Get horizontal spacing (left and right)
 * @param {number} multiplier - Multiplier of the base unit
 * @returns {object} Object with paddingLeft and paddingRight
 * @example spacingHorizontal(2) => { paddingLeft: '16px', paddingRight: '16px' }
 */
export const spacingHorizontal = (multiplier) => {
  const value = spacing(multiplier);
  return {
    paddingLeft: value,
    paddingRight: value,
  };
};

/**
 * Get padding for all sides
 * @param {number|number[]} multipliers - Single multiplier or array of [top, right, bottom, left]
 * @returns {object} Object with padding property
 * @example spacingPadding(2) => { padding: '16px' }
 * @example spacingPadding([1, 2, 1, 2]) => { padding: '8px 16px 8px 16px' }
 */
export const spacingPadding = (multipliers) => {
  return {
    padding: spacingMultiple(multipliers),
  };
};

/**
 * Get margin for all sides
 * @param {number|number[]} multipliers - Single multiplier or array of [top, right, bottom, left]
 * @returns {object} Object with margin property
 * @example spacingMargin(2) => { margin: '16px' }
 * @example spacingMargin([1, 2, 1, 2]) => { margin: '8px 16px 8px 16px' }
 */
export const spacingMargin = (multipliers) => {
  return {
    margin: spacingMultiple(multipliers),
  };
};

/**
 * Get gap value for flexbox/grid
 * @param {number} multiplier - Multiplier of the base unit
 * @returns {object} Object with gap property
 * @example spacingGap(2) => { gap: '16px' }
 */
export const spacingGap = (multiplier) => {
  return {
    gap: spacing(multiplier),
  };
};

/**
 * Typography Utility Functions
 * 
 * Helper functions for consistent typography throughout the application.
 */

/**
 * Get typography style by variant
 * @param {string} variant - Typography variant (h1-h6, body1, body2, button, caption)
 * @returns {object} Typography style object
 * @example getTypographyStyle('h1') => { fontSize: '2.5rem', fontWeight: 700, ... }
 */
export const getTypographyStyle = (variant) => {
  const styles = {
    h1: {
      fontSize: designTokens.typography.fontSize.xxxxl,
      fontWeight: designTokens.typography.fontWeight.bold,
      lineHeight: designTokens.typography.lineHeight.tight,
      letterSpacing: designTokens.typography.letterSpacing.tight,
    },
    h2: {
      fontSize: designTokens.typography.fontSize.xxxl,
      fontWeight: designTokens.typography.fontWeight.bold,
      lineHeight: designTokens.typography.lineHeight.tight,
      letterSpacing: designTokens.typography.letterSpacing.tight,
    },
    h3: {
      fontSize: designTokens.typography.fontSize.xxl,
      fontWeight: designTokens.typography.fontWeight.semibold,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    h4: {
      fontSize: designTokens.typography.fontSize.xl,
      fontWeight: designTokens.typography.fontWeight.semibold,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    h5: {
      fontSize: designTokens.typography.fontSize.lg,
      fontWeight: designTokens.typography.fontWeight.semibold,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    h6: {
      fontSize: designTokens.typography.fontSize.md,
      fontWeight: designTokens.typography.fontWeight.semibold,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    body1: {
      fontSize: designTokens.typography.fontSize.md,
      fontWeight: designTokens.typography.fontWeight.regular,
      lineHeight: designTokens.typography.lineHeight.relaxed,
    },
    body2: {
      fontSize: designTokens.typography.fontSize.sm,
      fontWeight: designTokens.typography.fontWeight.regular,
      lineHeight: designTokens.typography.lineHeight.relaxed,
    },
    button: {
      fontSize: designTokens.typography.fontSize.sm,
      fontWeight: designTokens.typography.fontWeight.medium,
      lineHeight: designTokens.typography.lineHeight.normal,
      letterSpacing: designTokens.typography.letterSpacing.wide,
      textTransform: 'none',
    },
    caption: {
      fontSize: designTokens.typography.fontSize.xs,
      fontWeight: designTokens.typography.fontWeight.regular,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
  };
  
  return styles[variant] || styles.body1;
};

/**
 * Get font size by named size
 * @param {string} size - Named size (xs, sm, md, lg, xl, xxl, xxxl, xxxxl)
 * @returns {string} Font size value
 * @example getFontSize('md') => '1rem'
 */
export const getFontSize = (size) => {
  return designTokens.typography.fontSize[size] || designTokens.typography.fontSize.md;
};

/**
 * Get font weight by name
 * @param {string} weight - Weight name (light, regular, medium, semibold, bold, extrabold)
 * @returns {number} Font weight value
 * @example getFontWeight('semibold') => 600
 */
export const getFontWeight = (weight) => {
  return designTokens.typography.fontWeight[weight] || designTokens.typography.fontWeight.regular;
};

/**
 * Get line height by name
 * @param {string} height - Line height name (tight, normal, relaxed, loose)
 * @returns {number} Line height value
 * @example getLineHeight('relaxed') => 1.6
 */
export const getLineHeight = (height) => {
  return designTokens.typography.lineHeight[height] || designTokens.typography.lineHeight.normal;
};

/**
 * Validate typography hierarchy (h1 > h2 > h3 > h4 > h5 > h6)
 * @returns {boolean} True if hierarchy is maintained
 */
export const validateTypographyHierarchy = () => {
  const h1Size = parseFloat(designTokens.typography.fontSize.xxxxl);
  const h2Size = parseFloat(designTokens.typography.fontSize.xxxl);
  const h3Size = parseFloat(designTokens.typography.fontSize.xxl);
  const h4Size = parseFloat(designTokens.typography.fontSize.xl);
  const h5Size = parseFloat(designTokens.typography.fontSize.lg);
  const h6Size = parseFloat(designTokens.typography.fontSize.md);
  
  return h1Size > h2Size && 
         h2Size > h3Size && 
         h3Size > h4Size && 
         h4Size > h5Size && 
         h5Size > h6Size;
};

/**
 * Create text style object
 * @param {object} options - Style options
 * @param {string} options.size - Font size (xs, sm, md, lg, xl, xxl, xxxl, xxxxl)
 * @param {string} options.weight - Font weight (light, regular, medium, semibold, bold, extrabold)
 * @param {string} options.lineHeight - Line height (tight, normal, relaxed, loose)
 * @param {string} options.letterSpacing - Letter spacing (tight, normal, wide, wider)
 * @returns {object} Text style object
 */
export const createTextStyle = ({ size, weight, lineHeight, letterSpacing } = {}) => {
  return {
    ...(size && { fontSize: getFontSize(size) }),
    ...(weight && { fontWeight: getFontWeight(weight) }),
    ...(lineHeight && { lineHeight: getLineHeight(lineHeight) }),
    ...(letterSpacing && { letterSpacing: designTokens.typography.letterSpacing[letterSpacing] }),
  };
};

/**
 * Validate that a spacing value is a multiple of the base unit
 * @param {number} value - Value in pixels to validate
 * @returns {boolean} True if value is a multiple of base unit
 * @example isValidSpacing(16) => true
 * @example isValidSpacing(15) => false
 */
export const isValidSpacing = (value) => {
  return value % designTokens.spacing.unit === 0;
};

/**
 * Get the nearest valid spacing value
 * @param {number} value - Value in pixels
 * @returns {number} Nearest value that is a multiple of base unit
 * @example getNearestSpacing(15) => 16
 * @example getNearestSpacing(17) => 16
 */
export const getNearestSpacing = (value) => {
  return Math.round(value / designTokens.spacing.unit) * designTokens.spacing.unit;
};

/**
 * Color Utility Functions
 * 
 * Helper functions for working with colors consistently throughout the application.
 */

/**
 * Get semantic color by name and variant
 * @param {string} colorName - Color name (primary, secondary, success, error, warning, info)
 * @param {string} variant - Color variant (main, light, dark, contrastText)
 * @param {boolean} isDark - Whether to use dark mode colors
 * @returns {string} Color value
 * @example getSemanticColor('primary', 'main') => '#007bff'
 */
export const getSemanticColor = (colorName, variant = 'main', isDark = false) => {
  const colors = isDark ? designTokens.darkColors : designTokens.colors;
  
  if (colors[colorName] && colors[colorName][variant]) {
    return colors[colorName][variant];
  }
  
  return colors.primary.main; // fallback
};

/**
 * Get all variants of a semantic color
 * @param {string} colorName - Color name (primary, secondary, success, error, warning, info)
 * @param {boolean} isDark - Whether to use dark mode colors
 * @returns {object} Object with all color variants
 * @example getColorVariants('primary') => { main: '#007bff', light: '#4da3ff', dark: '#0056b3', contrastText: '#ffffff' }
 */
export const getColorVariants = (colorName, isDark = false) => {
  const colors = isDark ? designTokens.darkColors : designTokens.colors;
  return colors[colorName] || colors.primary;
};

/**
 * Lighten a color by a percentage
 * @param {string} color - Hex color code
 * @param {number} percent - Percentage to lighten (0-100)
 * @returns {string} Lightened color
 */
export const lightenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1).toUpperCase();
};

/**
 * Darken a color by a percentage
 * @param {string} color - Hex color code
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {string} Darkened color
 */
export const darkenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  
  return '#' + (
    0x1000000 +
    (R > 0 ? R : 0) * 0x10000 +
    (G > 0 ? G : 0) * 0x100 +
    (B > 0 ? B : 0)
  ).toString(16).slice(1).toUpperCase();
};

/**
 * Add alpha transparency to a hex color
 * @param {string} color - Hex color code
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 * @example addAlpha('#007bff', 0.5) => 'rgba(0, 123, 255, 0.5)'
 */
export const addAlpha = (color, alpha) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Get hover state color for a given color
 * @param {string} color - Base color
 * @param {boolean} isDark - Whether in dark mode
 * @returns {string} Hover state color
 */
export const getHoverColor = (color, isDark = false) => {
  return isDark ? lightenColor(color, 10) : darkenColor(color, 10);
};

/**
 * Get active state color for a given color
 * @param {string} color - Base color
 * @param {boolean} isDark - Whether in dark mode
 * @returns {string} Active state color
 */
export const getActiveColor = (color, isDark = false) => {
  return isDark ? lightenColor(color, 15) : darkenColor(color, 15);
};

/**
 * Get disabled state color for a given color
 * @param {string} color - Base color
 * @returns {string} Disabled state color with reduced opacity
 */
export const getDisabledColor = (color) => {
  return addAlpha(color, 0.38);
};

/**
 * Calculate relative luminance of a color (for contrast calculations)
 * @param {string} color - Hex color code
 * @returns {number} Relative luminance (0-1)
 */
export const getRelativeLuminance = (color) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
};

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First hex color code
 * @param {string} color2 - Second hex color code
 * @returns {number} Contrast ratio (1-21)
 */
export const getContrastRatio = (color1, color2) => {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if color combination meets WCAG AA standards
 * @param {string} foreground - Foreground color (text)
 * @param {string} background - Background color
 * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} True if contrast meets WCAG AA standards
 */
export const meetsWCAGAA = (foreground, background, isLargeText = false) => {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Check if color combination meets WCAG AAA standards
 * @param {string} foreground - Foreground color (text)
 * @param {string} background - Background color
 * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} True if contrast meets WCAG AAA standards
 */
export const meetsWCAGAAA = (foreground, background, isLargeText = false) => {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
};

/**
 * Get appropriate text color (black or white) for a background color
 * @param {string} backgroundColor - Background hex color
 * @returns {string} '#000000' or '#FFFFFF' depending on which has better contrast
 */
export const getContrastText = (backgroundColor) => {
  const whiteContrast = getContrastRatio('#FFFFFF', backgroundColor);
  const blackContrast = getContrastRatio('#000000', backgroundColor);
  
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
};

/**
 * Generate light and dark variants from a base color
 * @param {string} baseColor - Base hex color
 * @returns {object} Object with main, light, and dark variants
 * @example generateColorVariants('#007bff') => { main: '#007bff', light: '#4da3ff', dark: '#0056b3' }
 */
export const generateColorVariants = (baseColor) => {
  return {
    main: baseColor,
    light: lightenColor(baseColor, 20),
    dark: darkenColor(baseColor, 20),
    contrastText: getContrastText(baseColor),
  };
};

/**
 * Get all state colors for a given base color
 * @param {string} baseColor - Base hex color
 * @param {boolean} isDark - Whether in dark mode
 * @returns {object} Object with default, hover, active, and disabled state colors
 * @example getStateColors('#007bff') => { default: '#007bff', hover: '#0056b3', active: '#004085', disabled: 'rgba(0, 123, 255, 0.38)' }
 */
export const getStateColors = (baseColor, isDark = false) => {
  return {
    default: baseColor,
    hover: getHoverColor(baseColor, isDark),
    active: getActiveColor(baseColor, isDark),
    disabled: getDisabledColor(baseColor),
  };
};

/**
 * Validate that all semantic colors are properly defined
 * @param {boolean} isDark - Whether to validate dark mode colors
 * @returns {boolean} True if all semantic colors are defined
 */
export const validateSemanticColors = (isDark = false) => {
  const colors = isDark ? designTokens.darkColors : designTokens.colors;
  const requiredColors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
  const requiredVariants = ['main', 'light', 'dark', 'contrastText'];
  
  return requiredColors.every(colorName => 
    colors[colorName] && 
    requiredVariants.every(variant => colors[colorName][variant])
  );
};

export default designTokens;
