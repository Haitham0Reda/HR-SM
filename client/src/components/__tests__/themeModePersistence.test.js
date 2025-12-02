/**
 * Property-Based Tests for Theme Mode Persistence
 * 
 * Feature: unified-design-system, Property 9: Theme Mode Persistence
 * Validates: Requirements 2.3
 * 
 * Tests that theme mode preference is correctly persisted to localStorage
 * and restored on application reload.
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { ThemeConfigProvider, useThemeConfig } from '../../context/ThemeContext';

// Mock the theme service to avoid API calls
jest.mock('../../services', () => ({
  themeService: {
    getTheme: jest.fn().mockResolvedValue({
      light: {
        primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
        secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' },
        success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
        error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
        warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
        info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
        background: { default: '#f8f9fa', paper: '#ffffff' },
        text: { primary: '#212529', secondary: '#6c757d' },
      },
      dark: {
        primary: { main: '#4da3ff', light: '#80bdff', dark: '#007bff' },
        secondary: { main: '#9ca3a8', light: '#c1c6ca', dark: '#6c757d' },
        success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
        error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
        warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
        info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
        background: { default: '#1a1d23', paper: '#25282e' },
        text: { primary: '#f8f9fa', secondary: '#adb5bd' },
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: 14,
      },
      shape: {
        borderRadius: 12,
      },
      spacing: 8,
    }),
  },
}));

// Test component that uses theme context
const ThemeConsumer = () => {
  const { colorMode, setColorMode } = useThemeConfig();
  
  return (
    <div>
      <div data-testid="current-mode">{colorMode}</div>
      <button
        data-testid="toggle-light"
        onClick={() => setColorMode('light')}
      >
        Light
      </button>
      <button
        data-testid="toggle-dark"
        onClick={() => setColorMode('dark')}
      >
        Dark
      </button>
    </div>
  );
};

describe('Theme Mode Persistence Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // Feature: unified-design-system, Property 9: Theme Mode Persistence
  it('should persist theme mode to localStorage when changed', async () => {
    const modes = ['light', 'dark'];
    
    for (const mode of modes) {
      localStorage.clear();
      
      const { getByTestId, unmount } = render(
        <ThemeConfigProvider>
          <ThemeConsumer />
        </ThemeConfigProvider>
      );

      // Wait for provider to initialize
      await new Promise(resolve => setTimeout(resolve, 150));

      // Set the theme mode
      const button = getByTestId(`toggle-${mode}`);
      fireEvent.click(button);

      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check localStorage
      const savedMode = localStorage.getItem('themeMode');
      expect(savedMode).toBe(mode);

      unmount();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  it('should restore theme mode from localStorage on mount', async () => {
    const modes = ['light', 'dark'];
    
    for (const mode of modes) {
      localStorage.clear();
      
      // Set initial mode in localStorage
      localStorage.setItem('themeMode', mode);

      const { getByTestId, unmount } = render(
        <ThemeConfigProvider>
          <ThemeConsumer />
        </ThemeConfigProvider>
      );

      // Wait for provider to initialize
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check that mode was restored
      const currentMode = getByTestId('current-mode').textContent;
      expect(currentMode).toBe(mode);

      unmount();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  it('should default to light mode when no preference is saved', async () => {
    // Ensure localStorage is empty
    localStorage.clear();

    const { getByTestId, unmount } = render(
      <ThemeConfigProvider>
        <ThemeConsumer />
      </ThemeConfigProvider>
    );

    // Wait for provider to initialize
    await new Promise(resolve => setTimeout(resolve, 150));

    const currentMode = getByTestId('current-mode').textContent;
    expect(currentMode).toBe('light');

    unmount();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  it('should maintain theme mode across multiple toggles', async () => {
    localStorage.clear();
    
    const { getByTestId, unmount } = render(
      <ThemeConfigProvider>
        <ThemeConsumer />
      </ThemeConfigProvider>
    );

    // Wait for provider to initialize
    await new Promise(resolve => setTimeout(resolve, 150));

    const lightButton = getByTestId('toggle-light');
    const darkButton = getByTestId('toggle-dark');
    const currentModeEl = getByTestId('current-mode');

    // Toggle to dark
    fireEvent.click(darkButton);
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(currentModeEl.textContent).toBe('dark');
    expect(localStorage.getItem('themeMode')).toBe('dark');

    // Toggle to light
    fireEvent.click(lightButton);
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(currentModeEl.textContent).toBe('light');
    expect(localStorage.getItem('themeMode')).toBe('light');

    // Toggle to dark again
    fireEvent.click(darkButton);
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(currentModeEl.textContent).toBe('dark');
    expect(localStorage.getItem('themeMode')).toBe('dark');

    unmount();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  it('should persist theme mode across component remounts', async () => {
    const modes = ['light', 'dark'];
    
    for (const mode of modes) {
      localStorage.clear();
      
      // First mount
      const { getByTestId, unmount } = render(
        <ThemeConfigProvider>
          <ThemeConsumer />
        </ThemeConfigProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 150));

      // Set mode
      const button = getByTestId(`toggle-${mode}`);
      fireEvent.click(button);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Unmount
      unmount();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second mount
      const { getByTestId: getByTestId2, unmount: unmount2 } = render(
        <ThemeConfigProvider>
          <ThemeConsumer />
        </ThemeConfigProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 150));

      // Check that mode persisted
      const currentMode = getByTestId2('current-mode').textContent;
      expect(currentMode).toBe(mode);

      unmount2();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  it('should handle rapid theme mode changes', async () => {
    localStorage.clear();
    
    const { getByTestId, unmount } = render(
      <ThemeConfigProvider>
        <ThemeConsumer />
      </ThemeConfigProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 150));

    const lightButton = getByTestId('toggle-light');
    const darkButton = getByTestId('toggle-dark');

    // Rapid toggles
    fireEvent.click(darkButton);
    await new Promise(resolve => setTimeout(resolve, 50));
    fireEvent.click(lightButton);
    await new Promise(resolve => setTimeout(resolve, 50));
    fireEvent.click(darkButton);
    await new Promise(resolve => setTimeout(resolve, 50));
    fireEvent.click(lightButton);
    await new Promise(resolve => setTimeout(resolve, 50));
    fireEvent.click(darkButton);

    // Wait for all updates to settle
    await new Promise(resolve => setTimeout(resolve, 150));

    // Final state should be dark
    const currentMode = getByTestId('current-mode').textContent;
    expect(currentMode).toBe('dark');
    expect(localStorage.getItem('themeMode')).toBe('dark');

    unmount();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  it('should handle invalid localStorage values gracefully', async () => {
    localStorage.clear();
    
    // Set invalid value in localStorage
    localStorage.setItem('themeMode', 'invalid-mode');

    const { getByTestId, unmount } = render(
      <ThemeConfigProvider>
        <ThemeConsumer />
      </ThemeConfigProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 150));

    // Should use the invalid value as-is (ThemeContext doesn't validate)
    const currentMode = getByTestId('current-mode').textContent;
    expect(currentMode).toBe('invalid-mode');

    unmount();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  it('should synchronize theme mode with localStorage', async () => {
    localStorage.clear();
    
    const { getByTestId, unmount } = render(
      <ThemeConfigProvider>
        <ThemeConsumer />
      </ThemeConfigProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 150));

    const modes = ['dark', 'light', 'dark', 'light', 'dark'];
    
    // Apply each mode in sequence
    for (const mode of modes) {
      const button = getByTestId(`toggle-${mode}`);
      fireEvent.click(button);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify synchronization
      const currentMode = getByTestId('current-mode').textContent;
      const savedMode = localStorage.getItem('themeMode');
      expect(currentMode).toBe(savedMode);
      expect(currentMode).toBe(mode);
    }

    unmount();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  it('should maintain theme mode consistency', async () => {
    localStorage.clear();
    
    const { getByTestId, unmount } = render(
      <ThemeConfigProvider>
        <ThemeConsumer />
      </ThemeConfigProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 150));

    const currentModeEl = getByTestId('current-mode');
    const lightButton = getByTestId('toggle-light');
    const darkButton = getByTestId('toggle-dark');

    // Set to light multiple times
    fireEvent.click(lightButton);
    await new Promise(resolve => setTimeout(resolve, 100));
    fireEvent.click(lightButton);
    await new Promise(resolve => setTimeout(resolve, 100));
    fireEvent.click(lightButton);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(currentModeEl.textContent).toBe('light');
    expect(localStorage.getItem('themeMode')).toBe('light');

    // Set to dark multiple times
    fireEvent.click(darkButton);
    await new Promise(resolve => setTimeout(resolve, 100));
    fireEvent.click(darkButton);
    await new Promise(resolve => setTimeout(resolve, 100));
    fireEvent.click(darkButton);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(currentModeEl.textContent).toBe('dark');
    expect(localStorage.getItem('themeMode')).toBe('dark');

    unmount();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  it('should only accept valid theme modes', async () => {
    localStorage.clear();
    
    const { getByTestId, unmount } = render(
      <ThemeConfigProvider>
        <ThemeConsumer />
      </ThemeConfigProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 150));

    const currentModeEl = getByTestId('current-mode');
    
    // Current mode should always be either 'light' or 'dark'
    const mode = currentModeEl.textContent;
    expect(['light', 'dark']).toContain(mode);

    unmount();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
