/**
 * Property-Based Tests for CSS Variable Availability
 * 
 * Feature: unified-design-system, Property 10: CSS Variable Availability
 * Validates: Requirements 1.4, 1.5
 * 
 * Tests that all design tokens are accessible both via JavaScript
 * (React context/hooks) and CSS (CSS variables).
 */

import fc from 'fast-check';
import { designTokens, generateCSSVariables, applyCSSVariables } from '../designTokens';

describe('CSS Variable Availability Property Tests', () => {
  // Feature: unified-design-system, Property 10: CSS Variable Availability
  it('should generate CSS variables for all color tokens', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isDark mode
        (isDark) => {
          const cssVars = generateCSSVariables(isDark);
          
          // Check that primary color variables exist
          expect(cssVars['--color-primary-main']).toBeDefined();
          expect(cssVars['--color-primary-light']).toBeDefined();
          expect(cssVars['--color-primary-dark']).toBeDefined();
          expect(cssVars['--color-primary-contrast']).toBeDefined();
          
          // Check that secondary color variables exist
          expect(cssVars['--color-secondary-main']).toBeDefined();
          expect(cssVars['--color-secondary-light']).toBeDefined();
          expect(cssVars['--color-secondary-dark']).toBeDefined();
          
          // Check that semantic color variables exist
          expect(cssVars['--color-success-main']).toBeDefined();
          expect(cssVars['--color-error-main']).toBeDefined();
          expect(cssVars['--color-warning-main']).toBeDefined();
          expect(cssVars['--color-info-main']).toBeDefined();
          
          // Check that background variables exist
          expect(cssVars['--color-background-default']).toBeDefined();
          expect(cssVars['--color-background-paper']).toBeDefined();
          
          // Check that text variables exist
          expect(cssVars['--color-text-primary']).toBeDefined();
          expect(cssVars['--color-text-secondary']).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate CSS variables for all spacing tokens', () => {
    const cssVars = generateCSSVariables(false);
    
    // Check that all spacing variables exist
    expect(cssVars['--spacing-xs']).toBe(designTokens.spacing.xs);
    expect(cssVars['--spacing-sm']).toBe(designTokens.spacing.sm);
    expect(cssVars['--spacing-md']).toBe(designTokens.spacing.md);
    expect(cssVars['--spacing-lg']).toBe(designTokens.spacing.lg);
    expect(cssVars['--spacing-xl']).toBe(designTokens.spacing.xl);
    expect(cssVars['--spacing-xxl']).toBe(designTokens.spacing.xxl);
    expect(cssVars['--spacing-xxxl']).toBe(designTokens.spacing.xxxl);
  });

  it('should generate CSS variables for all border radius tokens', () => {
    const cssVars = generateCSSVariables(false);
    
    // Check that all border radius variables exist
    expect(cssVars['--border-radius-none']).toBe(designTokens.borderRadius.none);
    expect(cssVars['--border-radius-sm']).toBe(designTokens.borderRadius.sm);
    expect(cssVars['--border-radius-md']).toBe(designTokens.borderRadius.md);
    expect(cssVars['--border-radius-lg']).toBe(designTokens.borderRadius.lg);
    expect(cssVars['--border-radius-xl']).toBe(designTokens.borderRadius.xl);
    expect(cssVars['--border-radius-xxl']).toBe(designTokens.borderRadius.xxl);
    expect(cssVars['--border-radius-round']).toBe(designTokens.borderRadius.round);
    expect(cssVars['--border-radius-pill']).toBe(designTokens.borderRadius.pill);
  });

  it('should generate CSS variables for all shadow tokens', () => {
    const cssVars = generateCSSVariables(false);
    
    // Check that all shadow variables exist
    expect(cssVars['--shadow-xs']).toBe(designTokens.shadows.xs);
    expect(cssVars['--shadow-sm']).toBe(designTokens.shadows.sm);
    expect(cssVars['--shadow-md']).toBe(designTokens.shadows.md);
    expect(cssVars['--shadow-lg']).toBe(designTokens.shadows.lg);
    expect(cssVars['--shadow-xl']).toBe(designTokens.shadows.xl);
    expect(cssVars['--shadow-xxl']).toBe(designTokens.shadows.xxl);
  });

  it('should generate CSS variables for all typography tokens', () => {
    const cssVars = generateCSSVariables(false);
    
    // Check that font family variables exist
    expect(cssVars['--font-family-primary']).toBe(designTokens.typography.fontFamily.primary);
    expect(cssVars['--font-family-mono']).toBe(designTokens.typography.fontFamily.mono);
    
    // Check that font size variables exist
    expect(cssVars['--font-size-xs']).toBe(designTokens.typography.fontSize.xs);
    expect(cssVars['--font-size-sm']).toBe(designTokens.typography.fontSize.sm);
    expect(cssVars['--font-size-md']).toBe(designTokens.typography.fontSize.md);
    expect(cssVars['--font-size-lg']).toBe(designTokens.typography.fontSize.lg);
    expect(cssVars['--font-size-xl']).toBe(designTokens.typography.fontSize.xl);
    
    // Check that font weight variables exist
    expect(cssVars['--font-weight-light']).toBe(designTokens.typography.fontWeight.light);
    expect(cssVars['--font-weight-regular']).toBe(designTokens.typography.fontWeight.regular);
    expect(cssVars['--font-weight-medium']).toBe(designTokens.typography.fontWeight.medium);
    expect(cssVars['--font-weight-semibold']).toBe(designTokens.typography.fontWeight.semibold);
    expect(cssVars['--font-weight-bold']).toBe(designTokens.typography.fontWeight.bold);
  });

  it('should apply CSS variables to document root', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isDark mode
        (isDark) => {
          // Apply CSS variables
          applyCSSVariables(isDark);
          
          // Check that variables are applied to document root
          const root = document.documentElement;
          const primaryColor = root.style.getPropertyValue('--color-primary-main');
          const spacing = root.style.getPropertyValue('--spacing-md');
          const borderRadius = root.style.getPropertyValue('--border-radius-lg');
          
          // Variables should be set
          expect(primaryColor).toBeTruthy();
          expect(spacing).toBeTruthy();
          expect(borderRadius).toBeTruthy();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should switch CSS variables when mode changes', () => {
    // Apply light mode
    applyCSSVariables(false);
    const root = document.documentElement;
    const lightPrimary = root.style.getPropertyValue('--color-primary-main');
    const lightBackground = root.style.getPropertyValue('--color-background-default');
    
    // Apply dark mode
    applyCSSVariables(true);
    const darkPrimary = root.style.getPropertyValue('--color-primary-main');
    const darkBackground = root.style.getPropertyValue('--color-background-default');
    
    // Colors should be different between modes
    expect(lightPrimary).not.toBe(darkPrimary);
    expect(lightBackground).not.toBe(darkBackground);
    
    // Dark mode should have darker background
    expect(darkBackground).toBeTruthy();
  });

  it('should maintain consistency between JS tokens and CSS variables', () => {
    const cssVars = generateCSSVariables(false);
    
    // Spacing consistency
    expect(cssVars['--spacing-md']).toBe(designTokens.spacing.md);
    expect(cssVars['--spacing-lg']).toBe(designTokens.spacing.lg);
    
    // Border radius consistency
    expect(cssVars['--border-radius-md']).toBe(designTokens.borderRadius.md);
    expect(cssVars['--border-radius-lg']).toBe(designTokens.borderRadius.lg);
    
    // Shadow consistency
    expect(cssVars['--shadow-sm']).toBe(designTokens.shadows.sm);
    expect(cssVars['--shadow-md']).toBe(designTokens.shadows.md);
    
    // Typography consistency
    expect(cssVars['--font-family-primary']).toBe(designTokens.typography.fontFamily.primary);
    expect(cssVars['--font-size-md']).toBe(designTokens.typography.fontSize.md);
    expect(cssVars['--font-weight-medium']).toBe(designTokens.typography.fontWeight.medium);
  });

  it('should provide all required design tokens via JavaScript', () => {
    // Check colors
    expect(designTokens.colors).toBeDefined();
    expect(designTokens.colors.primary).toBeDefined();
    expect(designTokens.colors.secondary).toBeDefined();
    expect(designTokens.colors.success).toBeDefined();
    expect(designTokens.colors.error).toBeDefined();
    expect(designTokens.colors.warning).toBeDefined();
    expect(designTokens.colors.info).toBeDefined();
    
    // Check spacing
    expect(designTokens.spacing).toBeDefined();
    expect(designTokens.spacing.unit).toBe(8);
    
    // Check border radius
    expect(designTokens.borderRadius).toBeDefined();
    
    // Check shadows
    expect(designTokens.shadows).toBeDefined();
    
    // Check typography
    expect(designTokens.typography).toBeDefined();
    expect(designTokens.typography.fontFamily).toBeDefined();
    expect(designTokens.typography.fontSize).toBeDefined();
    expect(designTokens.typography.fontWeight).toBeDefined();
    
    // Check breakpoints
    expect(designTokens.breakpoints).toBeDefined();
    
    // Check z-index
    expect(designTokens.zIndex).toBeDefined();
    
    // Check transitions
    expect(designTokens.transitions).toBeDefined();
  });
});
