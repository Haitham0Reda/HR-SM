/**
 * Theme Validation Utilities
 * 
 * Utilities for validating theme configuration to ensure it meets
 * the design system requirements.
 */

/**
 * Validate color palette structure
 * @param {object} palette - Color palette object
 * @returns {object} Validation result with isValid and errors
 */
export const validateColorPalette = (palette) => {
  const errors = [];
  const requiredColors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
  const requiredShades = ['main', 'light', 'dark'];

  requiredColors.forEach((colorName) => {
    if (!palette[colorName]) {
      errors.push(`Missing required color: ${colorName}`);
      return;
    }

    requiredShades.forEach((shade) => {
      if (!palette[colorName][shade]) {
        errors.push(`Missing ${shade} shade for ${colorName}`);
      }
    });

    // Validate hex color format
    Object.entries(palette[colorName]).forEach(([shade, value]) => {
      if (typeof value === 'string' && !isValidHexColor(value)) {
        errors.push(`Invalid hex color for ${colorName}.${shade}: ${value}`);
      }
    });
  });

  // Validate background colors
  if (!palette.background) {
    errors.push('Missing background colors');
  } else {
    if (!palette.background.default) errors.push('Missing background.default');
    if (!palette.background.paper) errors.push('Missing background.paper');
  }

  // Validate text colors
  if (!palette.text) {
    errors.push('Missing text colors');
  } else {
    if (!palette.text.primary) errors.push('Missing text.primary');
    if (!palette.text.secondary) errors.push('Missing text.secondary');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate theme configuration structure
 * @param {object} themeConfig - Theme configuration object
 * @returns {object} Validation result with isValid and errors
 */
export const validateThemeConfig = (themeConfig) => {
  const errors = [];

  // Validate light mode
  if (!themeConfig.light) {
    errors.push('Missing light mode configuration');
  } else {
    const lightValidation = validateColorPalette(themeConfig.light);
    if (!lightValidation.isValid) {
      errors.push(...lightValidation.errors.map(e => `Light mode: ${e}`));
    }
  }

  // Validate dark mode
  if (!themeConfig.dark) {
    errors.push('Missing dark mode configuration');
  } else {
    const darkValidation = validateColorPalette(themeConfig.dark);
    if (!darkValidation.isValid) {
      errors.push(...darkValidation.errors.map(e => `Dark mode: ${e}`));
    }
  }

  // Validate typography
  if (!themeConfig.typography) {
    errors.push('Missing typography configuration');
  } else {
    if (!themeConfig.typography.fontFamily) {
      errors.push('Missing typography.fontFamily');
    }
    if (typeof themeConfig.typography.fontSize !== 'number') {
      errors.push('typography.fontSize must be a number');
    }
  }

  // Validate shape
  if (!themeConfig.shape) {
    errors.push('Missing shape configuration');
  } else {
    if (typeof themeConfig.shape.borderRadius !== 'number') {
      errors.push('shape.borderRadius must be a number');
    }
  }

  // Validate spacing
  if (typeof themeConfig.spacing !== 'number') {
    errors.push('spacing must be a number');
  } else if (themeConfig.spacing % 4 !== 0) {
    errors.push('spacing should be a multiple of 4 for consistency');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if a string is a valid hex color
 * @param {string} color - Color string to validate
 * @returns {boolean} True if valid hex color
 */
export const isValidHexColor = (color) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @returns {number} Contrast ratio
 */
export const calculateContrastRatio = (color1, color2) => {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Get relative luminance of a color
 * @param {string} hexColor - Hex color string
 * @returns {number} Relative luminance
 */
export const getRelativeLuminance = (hexColor) => {
  const rgb = hexToRgb(hexColor);
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {object} RGB object with r, g, b properties
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

/**
 * Check if color combination meets WCAG AA standards
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {object} Result with passes and ratio
 */
export const meetsWCAGAA = (foreground, background, isLargeText = false) => {
  const ratio = calculateContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3 : 4.5;
  
  return {
    passes: ratio >= requiredRatio,
    ratio: ratio.toFixed(2),
    required: requiredRatio,
  };
};

/**
 * Check if color combination meets WCAG AAA standards
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {object} Result with passes and ratio
 */
export const meetsWCAGAAA = (foreground, background, isLargeText = false) => {
  const ratio = calculateContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 4.5 : 7;
  
  return {
    passes: ratio >= requiredRatio,
    ratio: ratio.toFixed(2),
    required: requiredRatio,
  };
};

/**
 * Validate all color combinations in theme for accessibility
 * @param {object} themeConfig - Theme configuration
 * @returns {object} Validation result with warnings
 */
export const validateAccessibility = (themeConfig) => {
  const warnings = [];
  
  // Check light mode
  if (themeConfig.light) {
    const { text, background } = themeConfig.light;
    
    // Check primary text on default background
    if (text?.primary && background?.default) {
      const result = meetsWCAGAA(text.primary, background.default);
      if (!result.passes) {
        warnings.push(
          `Light mode: Primary text on default background has insufficient contrast (${result.ratio}:1, required ${result.required}:1)`
        );
      }
    }
    
    // Check secondary text on default background
    if (text?.secondary && background?.default) {
      const result = meetsWCAGAA(text.secondary, background.default);
      if (!result.passes) {
        warnings.push(
          `Light mode: Secondary text on default background has insufficient contrast (${result.ratio}:1, required ${result.required}:1)`
        );
      }
    }
  }
  
  // Check dark mode
  if (themeConfig.dark) {
    const { text, background } = themeConfig.dark;
    
    // Check primary text on default background
    if (text?.primary && background?.default) {
      const result = meetsWCAGAA(text.primary, background.default);
      if (!result.passes) {
        warnings.push(
          `Dark mode: Primary text on default background has insufficient contrast (${result.ratio}:1, required ${result.required}:1)`
        );
      }
    }
    
    // Check secondary text on default background
    if (text?.secondary && background?.default) {
      const result = meetsWCAGAA(text.secondary, background.default);
      if (!result.passes) {
        warnings.push(
          `Dark mode: Secondary text on default background has insufficient contrast (${result.ratio}:1, required ${result.required}:1)`
        );
      }
    }
  }
  
  return {
    isAccessible: warnings.length === 0,
    warnings,
  };
};

/**
 * Sanitize theme configuration by filling in missing values with defaults
 * @param {object} themeConfig - Theme configuration
 * @param {object} defaultTheme - Default theme configuration
 * @returns {object} Sanitized theme configuration
 */
export const sanitizeThemeConfig = (themeConfig, defaultTheme) => {
  return {
    light: {
      ...defaultTheme.light,
      ...themeConfig.light,
      primary: { ...defaultTheme.light.primary, ...themeConfig.light?.primary },
      secondary: { ...defaultTheme.light.secondary, ...themeConfig.light?.secondary },
      success: { ...defaultTheme.light.success, ...themeConfig.light?.success },
      error: { ...defaultTheme.light.error, ...themeConfig.light?.error },
      warning: { ...defaultTheme.light.warning, ...themeConfig.light?.warning },
      info: { ...defaultTheme.light.info, ...themeConfig.light?.info },
      background: { ...defaultTheme.light.background, ...themeConfig.light?.background },
      text: { ...defaultTheme.light.text, ...themeConfig.light?.text },
    },
    dark: {
      ...defaultTheme.dark,
      ...themeConfig.dark,
      primary: { ...defaultTheme.dark.primary, ...themeConfig.dark?.primary },
      secondary: { ...defaultTheme.dark.secondary, ...themeConfig.dark?.secondary },
      success: { ...defaultTheme.dark.success, ...themeConfig.dark?.success },
      error: { ...defaultTheme.dark.error, ...themeConfig.dark?.error },
      warning: { ...defaultTheme.dark.warning, ...themeConfig.dark?.warning },
      info: { ...defaultTheme.dark.info, ...themeConfig.dark?.info },
      background: { ...defaultTheme.dark.background, ...themeConfig.dark?.background },
      text: { ...defaultTheme.dark.text, ...themeConfig.dark?.text },
    },
    typography: {
      ...defaultTheme.typography,
      ...themeConfig.typography,
    },
    shape: {
      ...defaultTheme.shape,
      ...themeConfig.shape,
    },
    spacing: themeConfig.spacing || defaultTheme.spacing,
  };
};

const themeValidation = {
  validateColorPalette,
  validateThemeConfig,
  validateAccessibility,
  isValidHexColor,
  calculateContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  sanitizeThemeConfig,
};

export default themeValidation;
