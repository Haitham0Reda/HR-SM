/**
 * Property-Based Tests for Spacing Multiplier Consistency
 * 
 * Feature: unified-design-system, Property 5: Spacing Multiplier Consistency
 * Validates: Requirements 5.1, 5.5
 * 
 * Tests that all spacing values used in the system are multiples of the base
 * spacing unit (8px), ensuring visual rhythm and consistency.
 */

import fc from 'fast-check';
import { 
  spacing, 
  spacingMultiple, 
  spacingBySize,
  isValidSpacing,
  getNearestSpacing,
  designTokens 
} from '../../theme/designTokens';

describe('Spacing Multiplier Consistency Property Tests', () => {
  const BASE_UNIT = designTokens.spacing.unit;

  // Feature: unified-design-system, Property 5: Spacing Multiplier Consistency
  it('should generate spacing values that are multiples of base unit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }), // spacing multiplier
        (multiplier) => {
          const spacingValue = spacing(multiplier);
          const numericValue = parseInt(spacingValue);
          
          // Spacing value should be a multiple of base unit
          expect(numericValue).toBe(multiplier * BASE_UNIT);
          expect(numericValue % BASE_UNIT).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate spacing values correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }), // any pixel value
        (value) => {
          const isValid = isValidSpacing(value);
          const isMultiple = value % BASE_UNIT === 0;
          
          // isValidSpacing should return true only for multiples of base unit
          expect(isValid).toBe(isMultiple);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should round to nearest valid spacing value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }), // any pixel value
        (value) => {
          const nearest = getNearestSpacing(value);
          
          // Nearest value should be a multiple of base unit
          expect(nearest % BASE_UNIT).toBe(0);
          
          // Nearest value should be within half a base unit of original
          const difference = Math.abs(nearest - value);
          expect(difference).toBeLessThanOrEqual(BASE_UNIT / 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate consistent spacing for multiple sides', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 1, maxLength: 4 }),
        (multipliers) => {
          const spacingValue = spacingMultiple(multipliers);
          const values = spacingValue.split(' ');
          
          // Each value should be a multiple of base unit
          values.forEach(val => {
            const numericValue = parseInt(val);
            expect(numericValue % BASE_UNIT).toBe(0);
          });
          
          // Number of values should match input
          if (multipliers.length === 1) {
            expect(values.length).toBe(1);
          } else {
            expect(values.length).toBe(multipliers.length);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have named spacing sizes as multiples of base unit or half unit', () => {
    const namedSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
    
    namedSizes.forEach(size => {
      const spacingValue = spacingBySize(size);
      const numericValue = parseInt(spacingValue);
      
      // Each named size should be a multiple of base unit or half unit (4px)
      // xs is 4px (0.5 × base), others are multiples of 8px
      expect(numericValue % (BASE_UNIT / 2)).toBe(0);
    });
  });

  it('should maintain spacing consistency across all named sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'),
        (size) => {
          const spacingValue = spacingBySize(size);
          const numericValue = parseInt(spacingValue);
          
          // Should be a multiple of base unit or half unit (4px)
          // xs is 4px (0.5 × base), others are multiples of 8px
          expect(numericValue % (BASE_UNIT / 2)).toBe(0);
          
          // Should match the design token value
          expect(spacingValue).toBe(designTokens.spacing[size]);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have ascending spacing values for named sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
    const values = sizes.map(size => parseInt(spacingBySize(size)));
    
    // Each value should be greater than the previous
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('should generate valid spacing for edge cases', () => {
    // Zero multiplier
    expect(spacing(0)).toBe('0px');
    expect(parseInt(spacing(0)) % BASE_UNIT).toBe(0);
    
    // Large multiplier
    const largeSpacing = spacing(100);
    expect(parseInt(largeSpacing) % BASE_UNIT).toBe(0);
    expect(parseInt(largeSpacing)).toBe(100 * BASE_UNIT);
  });

  it('should handle single multiplier in spacingMultiple', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (multiplier) => {
          const result = spacingMultiple(multiplier);
          const expected = spacing(multiplier);
          
          expect(result).toBe(expected);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle array of multipliers in spacingMultiple', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 2, maxLength: 4 }),
        (multipliers) => {
          const result = spacingMultiple(multipliers);
          const values = result.split(' ');
          
          // Should have same number of values as multipliers
          expect(values.length).toBe(multipliers.length);
          
          // Each value should match the corresponding multiplier
          values.forEach((val, index) => {
            const expected = spacing(multipliers[index]);
            expect(val).toBe(expected);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain base unit consistency', () => {
    // Base unit should be 8
    expect(BASE_UNIT).toBe(8);
    expect(designTokens.spacing.unit).toBe(8);
    
    // All named sizes should be multiples of 4px (half base unit)
    // xs is special case: 4px (0.5 × base)
    expect(parseInt(designTokens.spacing.xs)).toBe(4);       // 4px (0.5 × base)
    expect(parseInt(designTokens.spacing.sm) % 8).toBe(0);   // 8px (1 × base)
    expect(parseInt(designTokens.spacing.md) % 8).toBe(0);   // 16px (2 × base)
    expect(parseInt(designTokens.spacing.lg) % 8).toBe(0);   // 24px (3 × base)
    expect(parseInt(designTokens.spacing.xl) % 8).toBe(0);   // 32px (4 × base)
    expect(parseInt(designTokens.spacing.xxl) % 8).toBe(0);  // 48px (6 × base)
    expect(parseInt(designTokens.spacing.xxxl) % 8).toBe(0); // 64px (8 × base)
  });

  it('should correctly identify invalid spacing values', () => {
    const invalidValues = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    
    invalidValues.forEach(value => {
      expect(isValidSpacing(value)).toBe(false);
    });
  });

  it('should correctly identify valid spacing values', () => {
    const validValues = [0, 8, 16, 24, 32, 40, 48, 56, 64];
    
    validValues.forEach(value => {
      expect(isValidSpacing(value)).toBe(true);
    });
  });

  it('should round up and down correctly', () => {
    // Values closer to lower multiple should round down
    expect(getNearestSpacing(1)).toBe(0);
    expect(getNearestSpacing(2)).toBe(0);
    expect(getNearestSpacing(3)).toBe(0);
    
    // Values closer to upper multiple should round up
    expect(getNearestSpacing(5)).toBe(8);
    expect(getNearestSpacing(6)).toBe(8);
    expect(getNearestSpacing(7)).toBe(8);
    
    // Exact midpoint (4) should round to nearest even (0 or 8)
    const midpoint = getNearestSpacing(4);
    expect(midpoint % BASE_UNIT).toBe(0);
  });

  it('should maintain consistency between spacing functions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (multiplier) => {
          const directSpacing = spacing(multiplier);
          const multipleSpacing = spacingMultiple(multiplier);
          
          // Both should return the same value for single multiplier
          expect(directSpacing).toBe(multipleSpacing);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle zero and negative edge cases', () => {
    // Zero should work
    expect(spacing(0)).toBe('0px');
    expect(isValidSpacing(0)).toBe(true);
    expect(getNearestSpacing(0)).toBe(0);
    
    // Negative values should still follow the rule
    expect(isValidSpacing(-8)).toBe(true);
    expect(isValidSpacing(-7)).toBe(false);
  });

  it('should maintain spacing scale relationships', () => {
    // xs should be half of sm
    expect(parseInt(designTokens.spacing.xs) * 2).toBe(parseInt(designTokens.spacing.sm));
    
    // sm should be half of md
    expect(parseInt(designTokens.spacing.sm) * 2).toBe(parseInt(designTokens.spacing.md));
    
    // md should be 2/3 of lg
    expect(parseInt(designTokens.spacing.md) * 1.5).toBe(parseInt(designTokens.spacing.lg));
  });
});
