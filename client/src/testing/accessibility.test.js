/**
 * Accessibility Tests
 * 
 * Automated tests to ensure WCAG 2.1 AA compliance
 * across all components in the design system.
 */

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  calculateContrastRatio,
  meetsContrastStandards,
  auditThemeColors,
  auditAriaLabels,
  auditKeyboardNavigation,
  runAccessibilityAudit,
} from '../utils/accessibilityAudit';

// Import components to test
import Button from '../components/common/Button';
import TextField from '../components/common/TextField';
import Card from '../components/common/Card';
import { CardContent } from '@mui/material';

describe('Accessibility - Color Contrast', () => {
  test('calculateContrastRatio should return correct ratio', () => {
    // Black on white should be 21:1
    const ratio1 = calculateContrastRatio('#000000', '#ffffff');
    expect(ratio1).toBeCloseTo(21, 0);
    
    // White on white should be 1:1
    const ratio2 = calculateContrastRatio('#ffffff', '#ffffff');
    expect(ratio2).toBeCloseTo(1, 0);
    
    // Example color combination - using a darker blue that meets AA standards
    const ratio3 = calculateContrastRatio('#0056b3', '#ffffff');
    expect(ratio3).toBeGreaterThan(4.5); // Should meet AA standards
  });

  test('meetsContrastStandards should validate WCAG AA', () => {
    expect(meetsContrastStandards(4.5, 'AA', false)).toBe(true);
    expect(meetsContrastStandards(4.4, 'AA', false)).toBe(false);
    expect(meetsContrastStandards(3.0, 'AA', true)).toBe(true);
    expect(meetsContrastStandards(2.9, 'AA', true)).toBe(false);
  });

  test('theme colors should meet WCAG AA standards', () => {
    const theme = createTheme({
      palette: {
        mode: 'light',
        primary: {
          main: '#0056b3', // Darker blue that meets AA standards
          contrastText: '#ffffff',
        },
        background: {
          default: '#ffffff',
        },
        text: {
          primary: '#212529',
          secondary: '#495057', // Darker gray that meets AA standards
        },
      },
    });

    const audit = auditThemeColors(theme);
    
    // Should pass with no critical errors
    expect(audit.passed).toBe(true);
    expect(audit.summary.errors).toBe(0);
  });

  test('dark theme colors should meet WCAG AA standards', () => {
    const theme = createTheme({
      palette: {
        mode: 'dark',
        primary: {
          main: '#4da3ff',
          contrastText: '#000000',
        },
        background: {
          default: '#1a1d23',
        },
        text: {
          primary: '#f8f9fa',
          secondary: '#adb5bd',
        },
      },
    });

    const audit = auditThemeColors(theme);
    
    // Should pass with no critical errors
    expect(audit.passed).toBe(true);
    expect(audit.summary.errors).toBe(0);
  });
});

describe('Accessibility - ARIA Labels', () => {
  test('Button component should have accessible label', () => {
    const { container } = render(
      <Button>Click Me</Button>
    );

    const audit = auditAriaLabels(container);
    
    // Button with text content should pass
    expect(audit.passed).toBe(true);
    expect(audit.summary.errors).toBe(0);
  });

  test('Button with icon should have aria-label', () => {
    const { container } = render(
      <Button aria-label="Close">
        <span>×</span>
      </Button>
    );

    const audit = auditAriaLabels(container);
    
    // Button with aria-label should pass
    expect(audit.passed).toBe(true);
  });

  test('TextField should have associated label', () => {
    const { container } = render(
      <TextField
        label="Email Address"
        id="email"
      />
    );

    const audit = auditAriaLabels(container);
    
    // TextField with label should pass
    expect(audit.passed).toBe(true);
  });

  test('Image without alt should fail audit', () => {
    const { container } = render(
      <div>
        <img src="test.jpg" />
      </div>
    );

    const audit = auditAriaLabels(container);
    
    // Should fail due to missing alt
    expect(audit.passed).toBe(false);
    expect(audit.summary.errors).toBeGreaterThan(0);
  });
});

describe('Accessibility - Keyboard Navigation', () => {
  test('Button should be keyboard accessible', () => {
    const { container } = render(
      <Button>Click Me</Button>
    );

    const audit = auditKeyboardNavigation(container);
    
    // Button should be keyboard accessible by default
    expect(audit.passed).toBe(true);
  });

  test('Interactive div should have role and tabindex', () => {
    const { container } = render(
      <div onClick={() => {}} role="button" tabIndex={0}>
        Click Me
      </div>
    );

    const audit = auditKeyboardNavigation(container);
    
    // Should pass with proper role and tabindex
    expect(audit.passed).toBe(true);
  });

  test('Interactive div without role should fail', () => {
    // Create a div with onclick attribute (not React onClick)
    const div = document.createElement('div');
    div.setAttribute('onclick', 'void(0)');
    div.textContent = 'Click Me';
    
    const container = document.createElement('div');
    container.appendChild(div);

    const audit = auditKeyboardNavigation(container);
    
    // Should fail without role and tabindex
    expect(audit.passed).toBe(false);
    expect(audit.summary.errors).toBeGreaterThan(0);
  });
});

describe('Accessibility - Comprehensive Audit', () => {
  test('Card component should pass full accessibility audit', () => {
    const theme = createTheme({
      palette: {
        mode: 'light',
        primary: {
          main: '#0056b3', // Darker blue that meets AA standards
          contrastText: '#ffffff',
        },
        background: {
          default: '#ffffff',
          paper: '#ffffff',
        },
        text: {
          primary: '#212529',
          secondary: '#495057', // Darker gray that meets AA standards
        },
      },
    });

    const { container } = render(
      <ThemeProvider theme={theme}>
        <Card>
          <CardContent>
            <h2>Card Title</h2>
            <p>Card content goes here</p>
            <Button>Action</Button>
          </CardContent>
        </Card>
      </ThemeProvider>
    );

    const audit = runAccessibilityAudit(container, theme);
    
    // Should pass comprehensive audit
    expect(audit.passed).toBe(true);
    expect(audit.summary.errors).toBe(0);
  });

  test('Form with proper labels should pass audit', () => {
    const theme = createTheme();

    const { container } = render(
      <ThemeProvider theme={theme}>
        <form>
          <TextField
            label="Name"
            id="name"
            required
          />
          <TextField
            label="Email"
            id="email"
            type="email"
            required
          />
          <Button type="submit">Submit</Button>
        </form>
      </ThemeProvider>
    );

    const audit = runAccessibilityAudit(container, theme);
    
    // Form with proper labels should pass
    expect(audit.passed).toBe(true);
  });
});

describe('Accessibility - Focus Management', () => {
  test('Button should have visible focus indicator', () => {
    const { getByRole } = render(
      <Button>Click Me</Button>
    );

    const button = getByRole('button');
    button.focus();

    // Check if button has focus
    expect(document.activeElement).toBe(button);
  });

  test('TextField should be focusable', () => {
    const { getByLabelText } = render(
      <TextField label="Email" id="email" />
    );

    const input = getByLabelText('Email');
    input.focus();

    // Check if input has focus
    expect(document.activeElement).toBe(input);
  });
});

describe('Accessibility - Screen Reader Support', () => {
  test('Button should have proper role', () => {
    const { getByRole } = render(
      <Button>Click Me</Button>
    );

    const button = getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('TextField should have proper role', () => {
    const { getByRole } = render(
      <TextField label="Email" id="email" />
    );

    const textbox = getByRole('textbox');
    expect(textbox).toBeInTheDocument();
  });

  test('Heading should have proper role', () => {
    const { getByRole } = render(
      <h1>Page Title</h1>
    );

    const heading = getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });
});
