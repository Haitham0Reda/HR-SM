/**
 * Accessibility Audit Utilities
 * 
 * Tools for testing and ensuring WCAG 2.1 AA compliance
 * across the application.
 */

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 guidelines
 * 
 * @param {string} color1 - First color (hex, rgb, or rgba)
 * @param {string} color2 - Second color (hex, rgb, or rgba)
 * @returns {number} - Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1, color2) {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 * 
 * @param {string} color - Color in hex, rgb, or rgba format
 * @returns {number} - Relative luminance (0-1)
 */
function getRelativeLuminance(color) {
  const rgb = parseColor(color);
  
  const [r, g, b] = rgb.map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse color string to RGB array
 * 
 * @param {string} color - Color in hex, rgb, or rgba format
 * @returns {number[]} - RGB values [r, g, b]
 */
function parseColor(color) {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    return [
      parseInt(hex.substr(0, 2), 16),
      parseInt(hex.substr(2, 2), 16),
      parseInt(hex.substr(4, 2), 16),
    ];
  }
  
  // Handle rgb/rgba colors
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [
      parseInt(match[1]),
      parseInt(match[2]),
      parseInt(match[3]),
    ];
  }
  
  // Default to black if parsing fails
  return [0, 0, 0];
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * 
 * @param {number} ratio - Contrast ratio
 * @param {string} level - 'AA' or 'AAA'
 * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} - Whether contrast meets standards
 */
export function meetsContrastStandards(ratio, level = 'AA', isLargeText = false) {
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  // AA standards
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Audit color combinations in theme
 * 
 * @param {Object} theme - Theme configuration object
 * @returns {Object} - Audit results with issues
 */
export function auditThemeColors(theme) {
  const issues = [];
  const mode = theme.palette?.mode || 'light';
  
  // Check primary color contrast
  const primaryContrast = calculateContrastRatio(
    theme.palette?.primary?.main || '#007bff',
    theme.palette?.primary?.contrastText || '#ffffff'
  );
  
  if (!meetsContrastStandards(primaryContrast)) {
    issues.push({
      severity: 'error',
      component: 'Primary Button',
      issue: `Primary color contrast ratio ${primaryContrast.toFixed(2)} does not meet WCAG AA standards (4.5:1 required)`,
      colors: {
        background: theme.palette?.primary?.main,
        text: theme.palette?.primary?.contrastText,
      },
    });
  }
  
  // Check text on background contrast
  const textContrast = calculateContrastRatio(
    theme.palette?.background?.default || '#ffffff',
    theme.palette?.text?.primary || '#000000'
  );
  
  if (!meetsContrastStandards(textContrast)) {
    issues.push({
      severity: 'error',
      component: 'Body Text',
      issue: `Text contrast ratio ${textContrast.toFixed(2)} does not meet WCAG AA standards (4.5:1 required)`,
      colors: {
        background: theme.palette?.background?.default,
        text: theme.palette?.text?.primary,
      },
    });
  }
  
  // Check secondary text contrast
  const secondaryTextContrast = calculateContrastRatio(
    theme.palette?.background?.default || '#ffffff',
    theme.palette?.text?.secondary || '#666666'
  );
  
  if (!meetsContrastStandards(secondaryTextContrast)) {
    issues.push({
      severity: 'warning',
      component: 'Secondary Text',
      issue: `Secondary text contrast ratio ${secondaryTextContrast.toFixed(2)} does not meet WCAG AA standards (4.5:1 required)`,
      colors: {
        background: theme.palette?.background?.default,
        text: theme.palette?.text?.secondary,
      },
    });
  }
  
  return {
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    summary: {
      total: issues.length,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
    },
  };
}

/**
 * Check if element has proper ARIA labels
 * 
 * @param {HTMLElement} element - DOM element to check
 * @returns {Object} - Audit result
 */
export function auditAriaLabels(element) {
  const issues = [];
  
  // Check for buttons without labels
  const buttons = element.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const hasText = button.textContent.trim().length > 0;
    const hasAriaLabel = button.hasAttribute('aria-label');
    const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push({
        severity: 'error',
        element: 'button',
        index,
        issue: 'Button has no accessible label',
        suggestion: 'Add aria-label or visible text content',
      });
    }
  });
  
  // Check for images without alt text
  const images = element.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        severity: 'error',
        element: 'img',
        index,
        issue: 'Image missing alt attribute',
        suggestion: 'Add alt attribute describing the image',
      });
    }
  });
  
  // Check for form inputs without labels
  const inputs = element.querySelectorAll('input, select, textarea');
  inputs.forEach((input, index) => {
    const hasLabel = input.hasAttribute('aria-label') || 
                     input.hasAttribute('aria-labelledby') ||
                     element.querySelector(`label[for="${input.id}"]`);
    
    if (!hasLabel && input.type !== 'hidden') {
      issues.push({
        severity: 'error',
        element: input.tagName.toLowerCase(),
        index,
        issue: 'Form input missing label',
        suggestion: 'Add associated label or aria-label',
      });
    }
  });
  
  return {
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    summary: {
      total: issues.length,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
    },
  };
}

/**
 * Check keyboard navigation support
 * 
 * @param {HTMLElement} element - DOM element to check
 * @returns {Object} - Audit result
 */
export function auditKeyboardNavigation(element) {
  const issues = [];
  
  // Check for interactive elements with tabindex=-1
  const interactiveElements = element.querySelectorAll('button, a, input, select, textarea');
  interactiveElements.forEach((el, index) => {
    if (el.getAttribute('tabindex') === '-1' && !el.hasAttribute('disabled')) {
      issues.push({
        severity: 'warning',
        element: el.tagName.toLowerCase(),
        index,
        issue: 'Interactive element removed from tab order',
        suggestion: 'Remove tabindex="-1" or ensure alternative keyboard access',
      });
    }
  });
  
  // Check for click handlers on non-interactive elements
  const clickableElements = element.querySelectorAll('[onclick]');
  clickableElements.forEach((el, index) => {
    const isInteractive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
    const hasRole = el.hasAttribute('role');
    const hasTabIndex = el.hasAttribute('tabindex');
    
    if (!isInteractive && !hasRole && !hasTabIndex) {
      issues.push({
        severity: 'error',
        element: el.tagName.toLowerCase(),
        index,
        issue: 'Click handler on non-interactive element without keyboard support',
        suggestion: 'Add role="button" and tabindex="0", or use a button element',
      });
    }
  });
  
  return {
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    summary: {
      total: issues.length,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
    },
  };
}

/**
 * Run comprehensive accessibility audit
 * 
 * @param {HTMLElement} element - DOM element to audit
 * @param {Object} theme - Theme configuration
 * @returns {Object} - Complete audit results
 */
export function runAccessibilityAudit(element, theme) {
  const colorAudit = auditThemeColors(theme);
  const ariaAudit = auditAriaLabels(element);
  const keyboardAudit = auditKeyboardNavigation(element);
  
  const allIssues = [
    ...colorAudit.issues,
    ...ariaAudit.issues,
    ...keyboardAudit.issues,
  ];
  
  return {
    passed: colorAudit.passed && ariaAudit.passed && keyboardAudit.passed,
    audits: {
      colors: colorAudit,
      aria: ariaAudit,
      keyboard: keyboardAudit,
    },
    summary: {
      total: allIssues.length,
      errors: allIssues.filter(i => i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
    },
    issues: allIssues,
  };
}

/**
 * Generate accessibility report
 * 
 * @param {Object} auditResults - Results from runAccessibilityAudit
 * @returns {string} - Formatted report
 */
export function generateAccessibilityReport(auditResults) {
  const { passed, summary, issues } = auditResults;
  
  let report = '# Accessibility Audit Report\n\n';
  report += `**Status:** ${passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
  report += `**Summary:**\n`;
  report += `- Total Issues: ${summary.total}\n`;
  report += `- Errors: ${summary.errors}\n`;
  report += `- Warnings: ${summary.warnings}\n\n`;
  
  if (issues.length > 0) {
    report += '## Issues Found\n\n';
    
    const errors = issues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      report += '### Errors (Must Fix)\n\n';
      errors.forEach((issue, index) => {
        report += `${index + 1}. **${issue.component || issue.element}**\n`;
        report += `   - Issue: ${issue.issue}\n`;
        if (issue.suggestion) {
          report += `   - Suggestion: ${issue.suggestion}\n`;
        }
        if (issue.colors) {
          report += `   - Colors: ${issue.colors.background} on ${issue.colors.text}\n`;
        }
        report += '\n';
      });
    }
    
    const warnings = issues.filter(i => i.severity === 'warning');
    if (warnings.length > 0) {
      report += '### Warnings (Should Fix)\n\n';
      warnings.forEach((issue, index) => {
        report += `${index + 1}. **${issue.component || issue.element}**\n`;
        report += `   - Issue: ${issue.issue}\n`;
        if (issue.suggestion) {
          report += `   - Suggestion: ${issue.suggestion}\n`;
        }
        report += '\n';
      });
    }
  } else {
    report += '## ✅ No Issues Found\n\n';
    report += 'All accessibility checks passed!\n';
  }
  
  return report;
}

/**
 * Log accessibility audit results to console
 * 
 * @param {Object} auditResults - Results from runAccessibilityAudit
 */
export function logAccessibilityAudit(auditResults) {
  const { passed, summary, issues } = auditResults;
  
  console.group('🔍 Accessibility Audit');
  console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Total Issues: ${summary.total} (${summary.errors} errors, ${summary.warnings} warnings)`);
  
  if (issues.length > 0) {
    console.group('Issues');
    issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} ${issue.component || issue.element}: ${issue.issue}`);
      if (issue.suggestion) {
        console.log(`   💡 ${issue.suggestion}`);
      }
    });
    console.groupEnd();
  }
  
  console.groupEnd();
}
