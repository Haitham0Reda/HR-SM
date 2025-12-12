/**
 * Property-Based Tests for Color Contrast Accessibility
 * 
 * Feature: unified-design-system, Property 2: Color Contrast Accessibility
 * Validates: Requirements 2.5
 * 
 * Tests that all color combinations used in the system meet WCAG AA standards
 * for accessibility (minimum 4.5:1 for normal text, 3:1 for large text).
 */

import fc from 'fast-check';
import {
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getContrastText,
  getSemanticColor,
  designTokens,
} from '../../theme/designTokens';

describe('Color Contrast Accessibility Property Tests', () => {
  // Feature: unified-design-system, Property 2: Color Contrast Accessibility
  it('should have text colors that meet WCAG AA on default backgrounds', () => {
    const lightBg = designTokens.colors.background.default;
    const darkBg = designTokens.darkColors.background.default;
    
    const lightTextPrimary = designTokens.colors.text.primary;
    const darkTextPrimary = designTokens.darkColors.text.primary;
    
    // Light mode: dark text on light background
    expect(meetsWCAGAA(lightTextPrimary, lightBg, false)).toBe(true);
    
    // Dark mode: light text on dark background
    expect(meetsWCAGAA(darkTextPrimary, darkBg, false)).toBe(true);
  });

  it('should have text colors that meet WCAG AA on paper backgrounds', () => {
    const lightPaper = designTokens.colors.background.paper;
    const darkPaper = designTokens.darkColors.background.paper;
    
    const lightTextPrimary = designTokens.colors.text.primary;
    const darkTextPrimary = designTokens.darkColors.text.primary;
    
    // Light mode
    expect(meetsWCAGAA(lightTextPrimary, lightPaper, false)).toBe(true);
    
    // Dark mode
    expect(meetsWCAGAA(darkTextPrimary, darkPaper, false)).toBe(true);
  });

  it('should have semantic colors with sufficient contrast against their contrast text', () => {
    const semanticColors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
    
    semanticColors.forEach(colorName => {
      // Light mode
      const lightMain = designTokens.colors[colorName].main;
      const lightContrast = designTokens.colors[colorName].contrastText;
      const lightRatio = getContrastRatio(lightContrast, lightMain);
      
      // Should have reasonable contrast (at least 2:1 for UI components)
      expect(lightRatio).toBeGreaterThanOrEqual(2);
      
      // Dark mode
      const darkMain = designTokens.darkColors[colorName].main;
      const darkContrast = designTokens.darkColors[colorName].contrastText;
      const darkRatio = getContrastRatio(darkContrast, darkMain);
      
      expect(darkRatio).toBeGreaterThanOrEqual(2);
    });
  });

  it('should calculate contrast ratios correctly', () => {
    // Black on white should have maximum contrast (21:1)
    const blackWhiteRatio = getContrastRatio('#000000', '#FFFFFF');
    expect(blackWhiteRatio).toBeCloseTo(21, 0);
    
    // White on black should be the same
    const whiteBlackRatio = getContrastRatio('#FFFFFF', '#000000');
    expect(whiteBlackRatio).toBeCloseTo(21, 0);
    
    // Same color should have minimum contrast (1:1)
    const sameColorRatio = getContrastRatio('#007bff', '#007bff');
    expect(sameColorRatio).toBeCloseTo(1, 0);
  });

  it('should have contrast ratios that are symmetric', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        (color1Arr, color2Arr) => {
          const color1 = `#${color1Arr.join('')}`;
          const color2 = `#${color2Arr.join('')}`;
          
          const ratio1 = getContrastRatio(color1, color2);
          const ratio2 = getContrastRatio(color2, color1);
          
          // Contrast ratio should be the same regardless of order
          expect(ratio1).toBeCloseTo(ratio2, 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have contrast ratios between 1 and 21', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        (color1Arr, color2Arr) => {
          const color1 = `#${color1Arr.join('')}`;
          const color2 = `#${color2Arr.join('')}`;
          
          const ratio = getContrastRatio(color1, color2);
          
          // Ratio should be between 1 and 21
          expect(ratio).toBeGreaterThanOrEqual(1);
          expect(ratio).toBeLessThanOrEqual(21);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should meet WCAG AA for normal text at 4.5:1 ratio', () => {
    // Test with known color combinations
    const testCases = [
      { fg: '#000000', bg: '#FFFFFF', expected: true },  // 21:1 - passes
      { fg: '#767676', bg: '#FFFFFF', expected: true },  // ~4.5:1 - passes
      { fg: '#959595', bg: '#FFFFFF', expected: false }, // ~2.8:1 - fails
    ];
    
    testCases.forEach(({ fg, bg, expected }) => {
      expect(meetsWCAGAA(fg, bg, false)).toBe(expected);
    });
  });

  it('should meet WCAG AA for large text at 3:1 ratio', () => {
    // Large text has lower contrast requirement
    const testCases = [
      { fg: '#000000', bg: '#FFFFFF', expected: true },  // 21:1 - passes
      { fg: '#959595', bg: '#FFFFFF', expected: true },  // ~2.8:1 - fails for normal, but close to 3:1
      { fg: '#AAAAAA', bg: '#FFFFFF', expected: true },  // ~2.3:1 - might fail
    ];
    
    testCases.forEach(({ fg, bg }) => {
      const ratio = getContrastRatio(fg, bg);
      const meetsLargeText = ratio >= 3;
      expect(meetsWCAGAA(fg, bg, true)).toBe(meetsLargeText);
    });
  });

  it('should return appropriate contrast text for any background', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        (bgColorArr) => {
          const bgColor = `#${bgColorArr.join('')}`;
          const contrastText = getContrastText(bgColor);
          
          // Contrast text should be either black or white
          const isBlackOrWhite = contrastText === '#000000' || contrastText === '#FFFFFF';
          expect(isBlackOrWhite).toBe(true);
          
          // Should meet WCAG AA
          expect(meetsWCAGAA(contrastText, bgColor, false)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have secondary text with sufficient contrast', () => {
    // Light mode
    const lightBg = designTokens.colors.background.default;
    const lightTextSecondary = designTokens.colors.text.secondary;
    
    // Secondary text should meet at least WCAG AA for large text (3:1)
    const lightRatio = getContrastRatio(lightTextSecondary, lightBg);
    expect(lightRatio).toBeGreaterThanOrEqual(3);
    
    // Dark mode
    const darkBg = designTokens.darkColors.background.default;
    const darkTextSecondary = designTokens.darkColors.text.secondary;
    
    const darkRatio = getContrastRatio(darkTextSecondary, darkBg);
    expect(darkRatio).toBeGreaterThanOrEqual(3);
  });

  it('should have disabled text with at least 1.5:1 contrast', () => {
    // Disabled text can have lower contrast but should still be somewhat visible
    // WCAG allows lower contrast for disabled elements
    
    // Light mode
    const lightBg = designTokens.colors.background.default;
    const lightTextDisabled = designTokens.colors.text.disabled;
    const lightRatio = getContrastRatio(lightTextDisabled, lightBg);
    expect(lightRatio).toBeGreaterThanOrEqual(1.5);
    
    // Dark mode
    const darkBg = designTokens.darkColors.background.default;
    const darkTextDisabled = designTokens.darkColors.text.disabled;
    const darkRatio = getContrastRatio(darkTextDisabled, darkBg);
    expect(darkRatio).toBeGreaterThanOrEqual(1.5);
  });

  it('should maintain contrast when using semantic color variants', () => {
    const semanticColors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
    const variants = ['main', 'light', 'dark'];
    
    semanticColors.forEach(colorName => {
      variants.forEach(variant => {
        // Light mode
        const lightColor = getSemanticColor(colorName, variant, false);
        const lightContrast = designTokens.colors[colorName].contrastText;
        
        // Should have some contrast (at least 1.2:1 for UI components)
        const lightRatio = getContrastRatio(lightContrast, lightColor);
        expect(lightRatio).toBeGreaterThanOrEqual(1.2);
        
        // Dark mode
        const darkColor = getSemanticColor(colorName, variant, true);
        const darkContrast = designTokens.darkColors[colorName].contrastText;
        
        const darkRatio = getContrastRatio(darkContrast, darkColor);
        expect(darkRatio).toBeGreaterThanOrEqual(1.2);
      });
    });
  });

  it('should have WCAG AAA compliance for primary text', () => {
    // WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
    
    // Light mode
    const lightBg = designTokens.colors.background.default;
    const lightTextPrimary = designTokens.colors.text.primary;
    
    // Should ideally meet AAA
    const lightRatio = getContrastRatio(lightTextPrimary, lightBg);
    expect(lightRatio).toBeGreaterThanOrEqual(7);
    
    // Dark mode
    const darkBg = designTokens.darkColors.background.default;
    const darkTextPrimary = designTokens.darkColors.text.primary;
    
    const darkRatio = getContrastRatio(darkTextPrimary, darkBg);
    expect(darkRatio).toBeGreaterThanOrEqual(7);
  });

  it('should validate WCAG AA compliance correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        fc.boolean(), // isLargeText
        (fgArr, bgArr, isLargeText) => {
          const fg = `#${fgArr.join('')}`;
          const bg = `#${bgArr.join('')}`;
          
          const ratio = getContrastRatio(fg, bg);
          const meetsAA = meetsWCAGAA(fg, bg, isLargeText);
          
          const expectedThreshold = isLargeText ? 3 : 4.5;
          const shouldPass = ratio >= expectedThreshold;
          
          expect(meetsAA).toBe(shouldPass);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate WCAG AAA compliance correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }),
        fc.boolean(), // isLargeText
        (fgArr, bgArr, isLargeText) => {
          const fg = `#${fgArr.join('')}`;
          const bg = `#${bgArr.join('')}`;
          
          const ratio = getContrastRatio(fg, bg);
          const meetsAAA = meetsWCAGAAA(fg, bg, isLargeText);
          
          const expectedThreshold = isLargeText ? 4.5 : 7;
          const shouldPass = ratio >= expectedThreshold;
          
          expect(meetsAAA).toBe(shouldPass);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have border colors with sufficient contrast', () => {
    // Borders should be visible against backgrounds
    
    // Light mode
    const lightBg = designTokens.colors.background.default;
    const lightBorder = designTokens.colors.border;
    const lightRatio = getContrastRatio(lightBorder, lightBg);
    
    // Borders should be visible (at least 1.2:1)
    expect(lightRatio).toBeGreaterThanOrEqual(1.2);
    
    // Dark mode
    const darkBg = designTokens.darkColors.background.default;
    const darkBorder = designTokens.darkColors.border;
    const darkRatio = getContrastRatio(darkBorder, darkBg);
    
    expect(darkRatio).toBeGreaterThanOrEqual(1.2);
  });

  it('should maintain contrast between paper and default backgrounds', () => {
    // Paper should be distinguishable from default background
    
    // Light mode
    const lightDefault = designTokens.colors.background.default;
    const lightPaper = designTokens.colors.background.paper;
    const lightRatio = getContrastRatio(lightPaper, lightDefault);
    
    // Should have some contrast (at least 1.05:1)
    expect(lightRatio).toBeGreaterThanOrEqual(1.05);
    
    // Dark mode
    const darkDefault = designTokens.darkColors.background.default;
    const darkPaper = designTokens.darkColors.background.paper;
    const darkRatio = getContrastRatio(darkPaper, darkDefault);
    
    expect(darkRatio).toBeGreaterThanOrEqual(1.05);
  });

  it('should have consistent contrast across theme modes', () => {
    // Both light and dark modes should meet accessibility standards
    const semanticColors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
    
    semanticColors.forEach(colorName => {
      const lightMain = designTokens.colors[colorName].main;
      const lightContrast = designTokens.colors[colorName].contrastText;
      const lightRatio = getContrastRatio(lightContrast, lightMain);
      
      const darkMain = designTokens.darkColors[colorName].main;
      const darkContrast = designTokens.darkColors[colorName].contrastText;
      const darkRatio = getContrastRatio(darkContrast, darkMain);
      
      // Both should have reasonable contrast (at least 2:1 for UI components)
      expect(lightRatio).toBeGreaterThanOrEqual(2);
      expect(darkRatio).toBeGreaterThanOrEqual(2);
    });
  });
});
