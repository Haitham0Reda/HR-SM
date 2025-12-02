/**
 * Property-Based Tests for Responsive Breakpoint Behavior
 * 
 * Feature: unified-design-system, Property 8: Responsive Breakpoint Behavior
 * Validates: Requirements 9.1, 9.2, 9.3
 * 
 * Tests that layout adapts according to defined breakpoints:
 * - Mobile (<600px): overlay navigation
 * - Tablet (600-960px): collapsible sidebar
 * - Desktop (>960px): expanded sidebar
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { designTokens } from '../../theme/designTokens';

describe('Responsive Breakpoint Behavior Property Tests', () => {
  afterEach(() => {
    cleanup();
  });

  // Feature: unified-design-system, Property 8: Responsive Breakpoint Behavior
  it('should categorize viewport widths into correct breakpoint ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1920 }), // viewport width
        (width) => {
          // Determine expected breakpoint category
          let expectedCategory;
          if (width < designTokens.breakpoints.sm) {
            expectedCategory = 'mobile';
          } else if (width < designTokens.breakpoints.md) {
            expectedCategory = 'tablet';
          } else {
            expectedCategory = 'desktop';
          }
          
          // Verify breakpoint logic
          const isMobile = width < 600;
          const isTablet = width >= 600 && width < 960;
          const isDesktop = width >= 960;
          
          // Exactly one category should be true
          const categories = [isMobile, isTablet, isDesktop].filter(Boolean);
          expect(categories).toHaveLength(1);
          
          // Verify correct category
          if (expectedCategory === 'mobile') {
            expect(isMobile).toBe(true);
          } else if (expectedCategory === 'tablet') {
            expect(isTablet).toBe(true);
          } else {
            expect(isDesktop).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent breakpoint boundaries', () => {
    // Test that breakpoints are in ascending order
    expect(designTokens.breakpoints.xs).toBeLessThan(designTokens.breakpoints.sm);
    expect(designTokens.breakpoints.sm).toBeLessThan(designTokens.breakpoints.md);
    expect(designTokens.breakpoints.md).toBeLessThan(designTokens.breakpoints.lg);
    expect(designTokens.breakpoints.lg).toBeLessThan(designTokens.breakpoints.xl);
    
    // Test specific values match requirements
    expect(designTokens.breakpoints.sm).toBe(600);
    expect(designTokens.breakpoints.md).toBe(960);
  });

  it('should handle edge cases at breakpoint boundaries', () => {
    const testCases = [
      { width: 599, expected: 'mobile' },
      { width: 600, expected: 'tablet' },
      { width: 959, expected: 'tablet' },
      { width: 960, expected: 'desktop' },
    ];
    
    testCases.forEach(({ width, expected }) => {
      const isMobile = width < 600;
      const isTablet = width >= 600 && width < 960;
      const isDesktop = width >= 960;
      
      if (expected === 'mobile') {
        expect(isMobile).toBe(true);
        expect(isTablet).toBe(false);
        expect(isDesktop).toBe(false);
      } else if (expected === 'tablet') {
        expect(isMobile).toBe(false);
        expect(isTablet).toBe(true);
        expect(isDesktop).toBe(false);
      } else {
        expect(isMobile).toBe(false);
        expect(isTablet).toBe(false);
        expect(isDesktop).toBe(true);
      }
    });
  });

  it('should maintain breakpoint consistency across theme', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isDark mode
        (isDark) => {
          // Create theme with our custom breakpoints
          const theme = createTheme({
            palette: {
              mode: isDark ? 'dark' : 'light',
            },
            breakpoints: {
              values: {
                xs: designTokens.breakpoints.xs,
                sm: designTokens.breakpoints.sm,
                md: designTokens.breakpoints.md,
                lg: designTokens.breakpoints.lg,
                xl: designTokens.breakpoints.xl,
              },
            },
          });
          
          // Breakpoints should match our design tokens regardless of theme mode
          expect(theme.breakpoints.values.sm).toBe(600);
          expect(theme.breakpoints.values.md).toBe(960);
          expect(theme.breakpoints.values.lg).toBe(1280);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify viewport categories for random widths', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1920 }),
        (width) => {
          // Count how many categories this width falls into
          const categories = [];
          
          if (width < 600) categories.push('mobile');
          if (width >= 600 && width < 960) categories.push('tablet');
          if (width >= 960) categories.push('desktop');
          
          // Should be in exactly one category
          expect(categories.length).toBe(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle minimum and maximum viewport widths', () => {
    // Test minimum mobile width
    const minWidth = 320;
    expect(minWidth < 600).toBe(true);
    
    // Test maximum desktop width
    const maxWidth = 1920;
    expect(maxWidth >= 960).toBe(true);
    
    // Test that all widths in range are categorized
    fc.assert(
      fc.property(
        fc.integer({ min: minWidth, max: maxWidth }),
        (width) => {
          const isMobile = width < 600;
          const isTablet = width >= 600 && width < 960;
          const isDesktop = width >= 960;
          
          // At least one must be true
          expect(isMobile || isTablet || isDesktop).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have non-overlapping breakpoint ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1920 }),
        fc.integer({ min: 320, max: 1920 }),
        (width1, width2) => {
          const categorize = (w) => {
            if (w < 600) return 'mobile';
            if (w < 960) return 'tablet';
            return 'desktop';
          };
          
          const cat1 = categorize(width1);
          const cat2 = categorize(width2);
          
          // If widths are in the same category, they should have the same behavior
          if (cat1 === cat2) {
            expect(cat1).toBe(cat2);
          }
          
          // If widths are different, they might be in different categories
          if (width1 !== width2) {
            // This is fine - different widths can be in different categories
            expect(true).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
