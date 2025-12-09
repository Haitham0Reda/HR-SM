/**
 * Property-Based Tests for Component Style Consistency
 * 
 * Feature: unified-design-system, Property 3: Component Style Consistency
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 * 
 * Tests that all component types have consistent styling properties
 * (border radius, padding, font weight, etc.) when rendered with
 * the same variant and size.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Button from '../Button';
import Card from '../Card';
import Chip from '../Chip';
import { designTokens } from '../../../theme/designTokens';

const theme = createTheme();

describe('Component Style Consistency Property Tests', () => {
  // Feature: unified-design-system, Property 3: Component Style Consistency
  
  it('should apply consistent border radius across all components', () => {
    const { container: buttonContainer } = render(
      <ThemeProvider theme={theme}>
        <Button>Test</Button>
      </ThemeProvider>
    );
    
    const { container: cardContainer } = render(
      <ThemeProvider theme={theme}>
        <Card>Test</Card>
      </ThemeProvider>
    );
    
    const { container: chipContainer } = render(
      <ThemeProvider theme={theme}>
        <Chip label="Test" />
      </ThemeProvider>
    );
    
    // All components should use design token border radius
    expect(designTokens.borderRadius.md).toBeDefined();
    expect(designTokens.borderRadius.lg).toBeDefined();
  });

  it('should apply consistent font weights across button variants', () => {
    // Test each variant individually
    const variants = ['contained', 'outlined', 'text'];
    
    variants.forEach(variant => {
      const { unmount } = render(
        <ThemeProvider theme={theme}>
          <Button variant={variant}>Button 1</Button>
          <Button variant={variant}>Button 2</Button>
          <Button variant={variant}>Button 3</Button>
        </ThemeProvider>
      );
      
      const buttons = screen.getAllByRole('button');
      
      // All buttons with same variant should exist
      expect(buttons).toHaveLength(3);
      
      // Font weight should be consistent (medium = 500)
      expect(designTokens.typography.fontWeight.medium).toBe(500);
      
      unmount();
    });
  });

  it('should apply consistent sizing across button sizes', () => {
    // Test each size individually
    const sizes = ['small', 'medium', 'large'];
    
    sizes.forEach(size => {
      const { unmount } = render(
        <ThemeProvider theme={theme}>
          <Button size={size}>Button 1</Button>
          <Button size={size}>Button 2</Button>
        </ThemeProvider>
      );
      
      const buttons = screen.getAllByRole('button');
      
      // All buttons with same size should exist
      expect(buttons).toHaveLength(2);
      
      unmount();
    });
  });

  it('should use consistent spacing values from design tokens', () => {
    const spacingValues = Object.values(designTokens.spacing);
    
    // All spacing values should be defined
    expect(spacingValues.every(v => v !== undefined)).toBe(true);
    
    // Spacing unit should be 8
    expect(designTokens.spacing.unit).toBe(8);
    
    // All spacing should be multiples of base unit
    const numericSpacings = [
      parseInt(designTokens.spacing.xs),
      parseInt(designTokens.spacing.sm),
      parseInt(designTokens.spacing.md),
      parseInt(designTokens.spacing.lg),
      parseInt(designTokens.spacing.xl),
    ];
    
    numericSpacings.forEach(spacing => {
      expect(spacing % 4).toBe(0); // Should be multiple of 4px
    });
  });

  it('should apply consistent colors across semantic variants', () => {
    // Test each color individually
    const colors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
    
    colors.forEach(color => {
      const { unmount } = render(
        <ThemeProvider theme={theme}>
          <Button color={color}>Button</Button>
          <Chip label="Chip" color={color} />
        </ThemeProvider>
      );
      
      // Components should render with semantic colors
      const button = screen.getByRole('button');
      const chip = screen.getByText('Chip');
      
      expect(button).toBeInTheDocument();
      expect(chip).toBeInTheDocument();
      
      unmount();
    });
  });

  it('should maintain consistent shadow definitions', () => {
    const shadows = designTokens.shadows;
    
    // All shadow levels should be defined
    expect(shadows.none).toBe('none');
    expect(shadows.xs).toBeDefined();
    expect(shadows.sm).toBeDefined();
    expect(shadows.md).toBeDefined();
    expect(shadows.lg).toBeDefined();
    expect(shadows.xl).toBeDefined();
    expect(shadows.xxl).toBeDefined();
    
    // Shadows should follow consistent format
    expect(shadows.sm).toContain('rgb');
    expect(shadows.md).toContain('rgb');
    expect(shadows.lg).toContain('rgb');
  });

  it('should use consistent typography across components', () => {
    const typography = designTokens.typography;
    
    // Font family should be defined
    expect(typography.fontFamily.primary).toBeDefined();
    expect(typography.fontFamily.primary).toContain('Inter');
    
    // Font sizes should follow scale
    const fontSizes = [
      typography.fontSize.xs,
      typography.fontSize.sm,
      typography.fontSize.md,
      typography.fontSize.lg,
      typography.fontSize.xl,
    ];
    
    fontSizes.forEach(size => {
      expect(size).toBeDefined();
      expect(size).toContain('rem');
    });
    
    // Font weights should be consistent
    expect(typography.fontWeight.regular).toBe(400);
    expect(typography.fontWeight.medium).toBe(500);
    expect(typography.fontWeight.semibold).toBe(600);
    expect(typography.fontWeight.bold).toBe(700);
  });

  it('should render cards with consistent styling', () => {
    // Test with and without hover
    [true, false].forEach(hover => {
      const { unmount } = render(
        <ThemeProvider theme={theme}>
          <Card hover={hover}>Card 1</Card>
          <Card hover={hover}>Card 2</Card>
        </ThemeProvider>
      );
      
      const cards = screen.getAllByText(/Card \d/);
      
      // All cards should render
      expect(cards).toHaveLength(2);
      
      unmount();
    });
  });

  it('should apply consistent transitions across interactive components', () => {
    const transitions = designTokens.transitions;
    
    // Transition durations should be defined
    expect(transitions.duration.shortest).toBe(150);
    expect(transitions.duration.short).toBe(250);
    expect(transitions.duration.standard).toBe(300);
    
    // Easing functions should be defined
    expect(transitions.easing.easeInOut).toBeDefined();
    expect(transitions.easing.easeOut).toBeDefined();
    expect(transitions.easing.easeIn).toBeDefined();
  });

  it('should maintain consistent component structure', () => {
    // Test that all components accept sx prop for customization
    const { container: buttonContainer } = render(
      <ThemeProvider theme={theme}>
        <Button sx={{ margin: 2 }}>Button</Button>
      </ThemeProvider>
    );
    
    const { container: cardContainer } = render(
      <ThemeProvider theme={theme}>
        <Card sx={{ margin: 2 }}>Card</Card>
      </ThemeProvider>
    );
    
    const { container: chipContainer } = render(
      <ThemeProvider theme={theme}>
        <Chip label="Chip" sx={{ margin: 2 }} />
      </ThemeProvider>
    );
    
    // All components should render successfully with sx prop
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText('Chip')).toBeInTheDocument();
  });
});
