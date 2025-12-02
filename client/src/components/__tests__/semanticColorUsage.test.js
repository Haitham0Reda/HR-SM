/**
 * Property-Based Tests for Semantic Color Usage
 * 
 * Feature: unified-design-system, Property 7: Semantic Color Usage
 * Validates: Requirements 6.2
 * 
 * Tests that semantic colors (success, error, warning, info) are used consistently
 * across all components to represent the same meaning.
 */

import fc from 'fast-check';
import {
  getSemanticColor,
  getColorVariants,
  validateSemanticColors,
  designTokens,
} from '../../theme/designTokens';

describe('Semantic Color Usage Property Tests', () => {
  const semanticColors = ['success', 'error', 'warning', 'info'];
  const variants = ['main', 'light', 'dark', 'contrastText'];

  // Feature: unified-design-system, Property 7: Semantic Color Usage
  it('should have all semantic colors defined in both light and dark modes', () => {
    // Light mode
    expect(validateSemanticColors(false)).toBe(true);
    
    // Dark mode
    expect(validateSemanticColors(true)).toBe(true);
  });

  it('should return consistent colors for the same semantic color name', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...semanticColors),
        fc.constantFrom(...variants),
        fc.boolean(), // isDark
        (colorName, variant, isDark) => {
          const color1 = getSemanticColor(colorName, variant, isDark);
          const color2 = getSemanticColor(colorName, variant, isDark);
          
          // Same inputs should always return same color
          expect(color1).toBe(color2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all required variants for each semantic color', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...semanticColors),
        fc.boolean(), // isDark
        (colorName, isDark) => {
          const colorVariants = getColorVariants(colorName, isDark);
          
          // All variants should be defined
          expect(colorVariants).toHaveProperty('main');
          expect(colorVariants).toHaveProperty('light');
          expect(colorVariants).toHaveProperty('dark');
          expect(colorVariants).toHaveProperty('contrastText');
          
          // All variants should be valid color strings
          expect(typeof colorVariants.main).toBe('string');
          expect(typeof colorVariants.light).toBe('string');
          expect(typeof colorVariants.dark).toBe('string');
          expect(typeof colorVariants.contrastText).toBe('string');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain semantic meaning across light and dark modes', () => {
    semanticColors.forEach(colorName => {
      const lightColor = getSemanticColor(colorName, 'main', false);
      const darkColor = getSemanticColor(colorName, 'main', true);
      
      // Both should be defined
      expect(lightColor).toBeDefined();
      expect(darkColor).toBeDefined();
      
      // Both should be valid hex colors
      expect(lightColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(darkColor).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it('should have success color in green spectrum', () => {
    const successLight = getSemanticColor('success', 'main', false);
    const successDark = getSemanticColor('success', 'main', true);
    
    // Success colors should be defined
    expect(successLight).toBeDefined();
    expect(successDark).toBeDefined();
    
    // Verify they're in the green spectrum (G channel should be highest)
    const parseColor = (hex) => {
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      return { r, g, b };
    };
    
    const lightRGB = parseColor(successLight);
    const darkRGB = parseColor(successDark);
    
    // Green channel should be prominent
    expect(lightRGB.g).toBeGreaterThan(lightRGB.r);
    expect(darkRGB.g).toBeGreaterThan(darkRGB.r);
  });

  it('should have error color in red spectrum', () => {
    const errorLight = getSemanticColor('error', 'main', false);
    const errorDark = getSemanticColor('error', 'main', true);
    
    const parseColor = (hex) => {
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      return { r, g, b };
    };
    
    const lightRGB = parseColor(errorLight);
    const darkRGB = parseColor(errorDark);
    
    // Red channel should be prominent
    expect(lightRGB.r).toBeGreaterThan(lightRGB.g);
    expect(lightRGB.r).toBeGreaterThan(lightRGB.b);
    expect(darkRGB.r).toBeGreaterThan(darkRGB.g);
    expect(darkRGB.r).toBeGreaterThan(darkRGB.b);
  });

  it('should have warning color in yellow/amber spectrum', () => {
    const warningLight = getSemanticColor('warning', 'main', false);
    const warningDark = getSemanticColor('warning', 'main', true);
    
    const parseColor = (hex) => {
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      return { r, g, b };
    };
    
    const lightRGB = parseColor(warningLight);
    const darkRGB = parseColor(warningDark);
    
    // Yellow/amber has high R and G, low B
    expect(lightRGB.r).toBeGreaterThan(lightRGB.b);
    expect(lightRGB.g).toBeGreaterThan(lightRGB.b);
    expect(darkRGB.r).toBeGreaterThan(darkRGB.b);
    expect(darkRGB.g).toBeGreaterThan(darkRGB.b);
  });

  it('should have info color in blue/cyan spectrum', () => {
    const infoLight = getSemanticColor('info', 'main', false);
    const infoDark = getSemanticColor('info', 'main', true);
    
    const parseColor = (hex) => {
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      return { r, g, b };
    };
    
    const lightRGB = parseColor(infoLight);
    const darkRGB = parseColor(infoDark);
    
    // Blue/cyan has prominent blue channel
    expect(lightRGB.b).toBeGreaterThan(lightRGB.r);
    expect(darkRGB.b).toBeGreaterThan(darkRGB.r);
  });

  it('should return fallback color for invalid color names', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !semanticColors.includes(s)),
        fc.constantFrom(...variants),
        (invalidName, variant) => {
          const color = getSemanticColor(invalidName, variant);
          
          // Should return primary color as fallback
          const primaryColor = getSemanticColor('primary', 'main');
          expect(color).toBe(primaryColor);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should have light variant lighter than main', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...semanticColors),
        fc.boolean(), // isDark
        (colorName, isDark) => {
          const variants = getColorVariants(colorName, isDark);
          
          // Parse colors to compare brightness
          const parseColor = (hex) => {
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            return (r + g + b) / 3; // Simple brightness calculation
          };
          
          const mainBrightness = parseColor(variants.main);
          const lightBrightness = parseColor(variants.light);
          
          // Light variant should be brighter than main
          expect(lightBrightness).toBeGreaterThanOrEqual(mainBrightness);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have dark variant darker than main', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...semanticColors),
        fc.boolean(), // isDark
        (colorName, isDark) => {
          const variants = getColorVariants(colorName, isDark);
          
          // Parse colors to compare brightness
          const parseColor = (hex) => {
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            return (r + g + b) / 3; // Simple brightness calculation
          };
          
          const mainBrightness = parseColor(variants.main);
          const darkBrightness = parseColor(variants.dark);
          
          // Dark variant should be darker than main
          expect(darkBrightness).toBeLessThanOrEqual(mainBrightness);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have contrast text that is either black or white', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...semanticColors),
        fc.boolean(), // isDark
        (colorName, isDark) => {
          const variants = getColorVariants(colorName, isDark);
          const contrastText = variants.contrastText.toUpperCase();
          
          // Contrast text should be either white or black (or very close)
          const isWhite = contrastText === '#FFFFFF' || contrastText === '#FFF';
          const isBlack = contrastText === '#000000' || contrastText === '#000';
          const isLightGray = contrastText.startsWith('#F') || contrastText.startsWith('#E');
          const isDarkGray = contrastText.startsWith('#0') || contrastText.startsWith('#1') || contrastText.startsWith('#2');
          
          expect(isWhite || isBlack || isLightGray || isDarkGray).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistent color structure in design tokens', () => {
    const lightColors = designTokens.colors;
    const darkColors = designTokens.darkColors;
    
    semanticColors.forEach(colorName => {
      // Light mode colors
      expect(lightColors[colorName]).toBeDefined();
      expect(lightColors[colorName].main).toBeDefined();
      expect(lightColors[colorName].light).toBeDefined();
      expect(lightColors[colorName].dark).toBeDefined();
      expect(lightColors[colorName].contrastText).toBeDefined();
      
      // Dark mode colors
      expect(darkColors[colorName]).toBeDefined();
      expect(darkColors[colorName].main).toBeDefined();
      expect(darkColors[colorName].light).toBeDefined();
      expect(darkColors[colorName].dark).toBeDefined();
      expect(darkColors[colorName].contrastText).toBeDefined();
    });
  });

  it('should have primary and secondary colors defined', () => {
    const lightColors = designTokens.colors;
    const darkColors = designTokens.darkColors;
    
    // Primary
    expect(lightColors.primary).toBeDefined();
    expect(darkColors.primary).toBeDefined();
    
    // Secondary
    expect(lightColors.secondary).toBeDefined();
    expect(darkColors.secondary).toBeDefined();
  });

  it('should return valid hex colors for all semantic colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...semanticColors),
        fc.constantFrom(...variants),
        fc.boolean(), // isDark
        (colorName, variant, isDark) => {
          const color = getSemanticColor(colorName, variant, isDark);
          
          // Should be a valid hex color or rgba
          const isHex = /^#[0-9A-F]{6}$/i.test(color);
          const isRgba = /^rgba?\(/.test(color);
          
          expect(isHex || isRgba).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain semantic color consistency across multiple calls', () => {
    const calls = 10;
    
    semanticColors.forEach(colorName => {
      const colors = Array.from({ length: calls }, () => 
        getSemanticColor(colorName, 'main', false)
      );
      
      // All calls should return the same color
      const firstColor = colors[0];
      colors.forEach(color => {
        expect(color).toBe(firstColor);
      });
    });
  });
});
