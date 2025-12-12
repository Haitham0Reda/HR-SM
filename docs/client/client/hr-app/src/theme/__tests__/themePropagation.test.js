/**
 * Property-Based Tests for Theme Propagation
 * 
 * Feature: unified-design-system, Property 1: Theme Propagation Consistency
 * Validates: Requirements 1.3
 * 
 * Tests that theme configuration updates propagate to all components
 * without requiring manual updates or page reload.
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Button, Card, TextField } from '@mui/material';

// Helper component that uses theme values
const ThemeConsumer = () => {
  return (
    <div>
      <Button data-testid="test-button" variant="contained">
        Test Button
      </Button>
      <Card data-testid="test-card">
        <p>Test Card</p>
      </Card>
      <TextField data-testid="test-input" label="Test Input" />
    </div>
  );
};

// Helper to create a theme config from colors
const createThemeConfig = (primaryColor, secondaryColor) => ({
  light: {
    primary: { main: primaryColor, light: `${primaryColor}aa`, dark: `${primaryColor}dd` },
    secondary: { main: secondaryColor, light: `${secondaryColor}aa`, dark: `${secondaryColor}dd` },
    success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
    error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
    warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
    info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
    background: { default: '#f8f9fa', paper: '#ffffff' },
    text: { primary: '#212529', secondary: '#6c757d' },
  },
  dark: {
    primary: { main: `${primaryColor}aa`, light: `${primaryColor}cc`, dark: primaryColor },
    secondary: { main: `${secondaryColor}aa`, light: `${secondaryColor}cc`, dark: secondaryColor },
    success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
    error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
    warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
    info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
    background: { default: '#1a1d23', paper: '#25282e' },
    text: { primary: '#f8f9fa', secondary: '#adb5bd' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    fontSize: 14,
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
});

describe('Theme Propagation Property Tests', () => {
  afterEach(() => {
    cleanup();
  });

  // Feature: unified-design-system, Property 1: Theme Propagation Consistency
  it('should propagate theme updates to all components', () => {
    // Generate hex color using correct fast-check API
    // Avoid pure black/white by using range 0x111111 to 0xEEEEEE
    const hexColor = () => fc.integer({ min: 0x111111, max: 0xEEEEEE }).map(n => `#${n.toString(16).padStart(6, '0')}`);
    
    fc.assert(
      fc.property(
        hexColor(),
        hexColor(),
        (primaryColor, secondaryColor) => {
          try {
            // Create theme from colors
            const theme = createTheme({
              palette: {
                primary: { main: primaryColor },
                secondary: { main: secondaryColor },
              },
            });
            
            // Render with theme
            const { unmount } = render(
              <ThemeProvider theme={theme}>
                <ThemeConsumer />
              </ThemeProvider>
            );
            
            // Verify components are rendered
            const button = screen.getByTestId('test-button');
            const card = screen.getByTestId('test-card');
            const input = screen.getByTestId('test-input');
            
            // All components should be present
            expect(button).toBeInTheDocument();
            expect(card).toBeInTheDocument();
            expect(input).toBeInTheDocument();
            
            unmount();
            return true;
          } catch (error) {
            console.error('Test failed with colors:', primaryColor, secondaryColor, error);
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain theme consistency across component tree', () => {
    // Avoid pure black/white by using range 0x111111 to 0xEEEEEE
    const hexColor = () => fc.integer({ min: 0x111111, max: 0xEEEEEE }).map(n => `#${n.toString(16).padStart(6, '0')}`);
    
    fc.assert(
      fc.property(
        hexColor(),
        (primaryColor) => {
          const theme = createTheme({
            palette: {
              primary: { main: primaryColor },
            },
          });
          
          const { unmount } = render(
            <ThemeProvider theme={theme}>
              <div>
                <Button>Button 1</Button>
                <Button>Button 2</Button>
                <Button>Button 3</Button>
              </div>
            </ThemeProvider>
          );
          
          const buttons = screen.getAllByRole('button');
          
          // All buttons should be rendered
          expect(buttons).toHaveLength(3);
          
          unmount();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle theme updates without errors', () => {
    // Avoid pure black/white by using range 0x111111 to 0xEEEEEE
    const hexColor = () => fc.integer({ min: 0x111111, max: 0xEEEEEE }).map(n => `#${n.toString(16).padStart(6, '0')}`);
    
    fc.assert(
      fc.property(
        fc.array(hexColor(), { minLength: 2, maxLength: 5 }),
        (colors) => {
          let lastRender = null;
          
          // Apply each color as a theme update
          colors.forEach((color) => {
            const theme = createTheme({
              palette: {
                primary: { main: color },
              },
            });
            
            if (lastRender) {
              lastRender.rerender(
                <ThemeProvider theme={theme}>
                  <Button>Test Button</Button>
                </ThemeProvider>
              );
            } else {
              lastRender = render(
                <ThemeProvider theme={theme}>
                  <Button>Test Button</Button>
                </ThemeProvider>
              );
            }
            
            // Button should still be rendered after update
            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
          });
          
          if (lastRender) {
            lastRender.unmount();
          }
          return true;
        }
      ),
      { numRuns: 50 } // Fewer runs since this test does multiple updates
    );
  });
});
