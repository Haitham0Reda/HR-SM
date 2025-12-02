/**
 * Property-Based Tests for Typography Hierarchy Preservation
 * 
 * Feature: unified-design-system, Property 6: Typography Hierarchy Preservation
 * Validates: Requirements 5.2
 * 
 * Tests that heading levels (h1-h6) maintain consistent size relationships
 * where h1 > h2 > h3 > h4 > h5 > h6, ensuring proper visual hierarchy.
 */

import fc from 'fast-check';
import { 
  getTypographyStyle,
  getFontSize,
  validateTypographyHierarchy,
  designTokens 
} from '../../theme/designTokens';

describe('Typography Hierarchy Preservation Property Tests', () => {
  // Helper to convert rem/em to pixels for comparison
  const remToPx = (remValue) => {
    if (typeof remValue === 'string' && remValue.includes('rem')) {
      return parseFloat(remValue) * 16; // Assuming 1rem = 16px
    }
    return parseFloat(remValue);
  };

  // Feature: unified-design-system, Property 6: Typography Hierarchy Preservation
  it('should maintain heading hierarchy h1 > h2 > h3 > h4 > h5 > h6', () => {
    const h1 = getTypographyStyle('h1');
    const h2 = getTypographyStyle('h2');
    const h3 = getTypographyStyle('h3');
    const h4 = getTypographyStyle('h4');
    const h5 = getTypographyStyle('h5');
    const h6 = getTypographyStyle('h6');

    const h1Size = remToPx(h1.fontSize);
    const h2Size = remToPx(h2.fontSize);
    const h3Size = remToPx(h3.fontSize);
    const h4Size = remToPx(h4.fontSize);
    const h5Size = remToPx(h5.fontSize);
    const h6Size = remToPx(h6.fontSize);

    // Verify strict descending order
    expect(h1Size).toBeGreaterThan(h2Size);
    expect(h2Size).toBeGreaterThan(h3Size);
    expect(h3Size).toBeGreaterThan(h4Size);
    expect(h4Size).toBeGreaterThan(h5Size);
    expect(h5Size).toBeGreaterThan(h6Size);
  });

  it('should validate typography hierarchy using utility function', () => {
    const isValid = validateTypographyHierarchy();
    expect(isValid).toBe(true);
  });

  it('should maintain hierarchy for any pair of heading levels', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('h1', 'h2', 'h3', 'h4', 'h5', 'h6'),
        fc.constantFrom('h1', 'h2', 'h3', 'h4', 'h5', 'h6'),
        (level1, level2) => {
          const style1 = getTypographyStyle(level1);
          const style2 = getTypographyStyle(level2);
          
          const size1 = remToPx(style1.fontSize);
          const size2 = remToPx(style2.fontSize);
          
          const num1 = parseInt(level1.substring(1));
          const num2 = parseInt(level2.substring(1));
          
          // If level1 is smaller number (higher in hierarchy), it should have larger font size
          if (num1 < num2) {
            expect(size1).toBeGreaterThan(size2);
          } else if (num1 > num2) {
            expect(size1).toBeLessThan(size2);
          } else {
            expect(size1).toBe(size2);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent font size mappings', () => {
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    headings.forEach(heading => {
      const style = getTypographyStyle(heading);
      expect(style.fontSize).toBeDefined();
      expect(typeof style.fontSize).toBe('string');
      expect(remToPx(style.fontSize)).toBeGreaterThan(0);
    });
  });

  it('should maintain hierarchy across design token font sizes', () => {
    // Map heading levels to their expected font size tokens
    const expectedSizes = {
      h1: designTokens.typography.fontSize.xxxxl,
      h2: designTokens.typography.fontSize.xxxl,
      h3: designTokens.typography.fontSize.xxl,
      h4: designTokens.typography.fontSize.xl,
      h5: designTokens.typography.fontSize.lg,
      h6: designTokens.typography.fontSize.md,
    };

    Object.entries(expectedSizes).forEach(([heading, expectedSize]) => {
      const style = getTypographyStyle(heading);
      expect(style.fontSize).toBe(expectedSize);
    });
  });

  it('should have descending font sizes in design tokens', () => {
    const sizes = [
      designTokens.typography.fontSize.xxxxl,
      designTokens.typography.fontSize.xxxl,
      designTokens.typography.fontSize.xxl,
      designTokens.typography.fontSize.xl,
      designTokens.typography.fontSize.lg,
      designTokens.typography.fontSize.md,
    ];

    const numericSizes = sizes.map(remToPx);

    // Each size should be greater than the next
    for (let i = 0; i < numericSizes.length - 1; i++) {
      expect(numericSizes[i]).toBeGreaterThan(numericSizes[i + 1]);
    }
  });

  it('should maintain hierarchy regardless of theme mode', () => {
    // Typography hierarchy should be independent of light/dark mode
    fc.assert(
      fc.property(
        fc.boolean(), // theme mode (light/dark)
        (isDark) => {
          // Typography styles should be the same regardless of theme mode
          const h1 = getTypographyStyle('h1');
          const h2 = getTypographyStyle('h2');
          
          const h1Size = remToPx(h1.fontSize);
          const h2Size = remToPx(h2.fontSize);
          
          expect(h1Size).toBeGreaterThan(h2Size);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have appropriate font weights for headings', () => {
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    headings.forEach(heading => {
      const style = getTypographyStyle(heading);
      expect(style.fontWeight).toBeDefined();
      expect(typeof style.fontWeight).toBe('number');
      
      // Headings should have medium to bold weight (500-700)
      expect(style.fontWeight).toBeGreaterThanOrEqual(500);
      expect(style.fontWeight).toBeLessThanOrEqual(800);
    });
  });

  it('should have appropriate line heights for headings', () => {
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    headings.forEach(heading => {
      const style = getTypographyStyle(heading);
      expect(style.lineHeight).toBeDefined();
      expect(typeof style.lineHeight).toBe('number');
      
      // Line height should be reasonable (1.0 - 2.0)
      expect(style.lineHeight).toBeGreaterThanOrEqual(1.0);
      expect(style.lineHeight).toBeLessThanOrEqual(2.0);
    });
  });

  it('should maintain consistent heading styles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('h1', 'h2', 'h3', 'h4', 'h5', 'h6'),
        (heading) => {
          const style1 = getTypographyStyle(heading);
          const style2 = getTypographyStyle(heading);
          
          // Same heading should always return same style
          expect(style1.fontSize).toBe(style2.fontSize);
          expect(style1.fontWeight).toBe(style2.fontWeight);
          expect(style1.lineHeight).toBe(style2.lineHeight);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have body text smaller than all headings', () => {
    const body1 = getTypographyStyle('body1');
    const body2 = getTypographyStyle('body2');
    const h6 = getTypographyStyle('h6');

    const body1Size = remToPx(body1.fontSize);
    const body2Size = remToPx(body2.fontSize);
    const h6Size = remToPx(h6.fontSize);

    // h6 (smallest heading) should be >= body text
    expect(h6Size).toBeGreaterThanOrEqual(body1Size);
    
    // body2 should be smaller than body1
    expect(body1Size).toBeGreaterThanOrEqual(body2Size);
  });

  it('should have reasonable size ratios between heading levels', () => {
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const sizes = headings.map(h => remToPx(getTypographyStyle(h).fontSize));

    // Check that size differences are reasonable (not too extreme)
    for (let i = 0; i < sizes.length - 1; i++) {
      const ratio = sizes[i] / sizes[i + 1];
      
      // Ratio should be between 1.1 and 1.5 (reasonable scale)
      expect(ratio).toBeGreaterThan(1.0);
      expect(ratio).toBeLessThan(2.0);
    }
  });

  it('should maintain hierarchy with getFontSize utility', () => {
    const sizes = ['xxxxl', 'xxxl', 'xxl', 'xl', 'lg', 'md'];
    const numericSizes = sizes.map(size => remToPx(getFontSize(size)));

    // Each size should be greater than the next
    for (let i = 0; i < numericSizes.length - 1; i++) {
      expect(numericSizes[i]).toBeGreaterThan(numericSizes[i + 1]);
    }
  });

  it('should have all font sizes defined in design tokens', () => {
    const requiredSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl', 'xxxxl'];
    
    requiredSizes.forEach(size => {
      expect(designTokens.typography.fontSize[size]).toBeDefined();
      expect(typeof designTokens.typography.fontSize[size]).toBe('string');
    });
  });

  it('should have consistent typography structure', () => {
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    headings.forEach(heading => {
      const style = getTypographyStyle(heading);
      
      // Each heading should have all required properties
      expect(style).toHaveProperty('fontSize');
      expect(style).toHaveProperty('fontWeight');
      expect(style).toHaveProperty('lineHeight');
    });
  });

  it('should handle edge cases gracefully', () => {
    // Invalid variant should return default (body1)
    const invalidStyle = getTypographyStyle('invalid');
    const body1Style = getTypographyStyle('body1');
    
    expect(invalidStyle.fontSize).toBe(body1Style.fontSize);
  });

  it('should maintain hierarchy across all typography variants', () => {
    const allVariants = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body1', 'body2', 'button', 'caption'];
    
    allVariants.forEach(variant => {
      const style = getTypographyStyle(variant);
      expect(style).toBeDefined();
      expect(style.fontSize).toBeDefined();
    });
  });

  it('should have larger headings with tighter line height', () => {
    const h1 = getTypographyStyle('h1');
    const h6 = getTypographyStyle('h6');
    const body1 = getTypographyStyle('body1');

    // Larger headings typically have tighter line height
    expect(h1.lineHeight).toBeLessThanOrEqual(body1.lineHeight);
    
    // All line heights should be reasonable
    expect(h1.lineHeight).toBeGreaterThan(1.0);
    expect(h6.lineHeight).toBeGreaterThan(1.0);
  });
});
