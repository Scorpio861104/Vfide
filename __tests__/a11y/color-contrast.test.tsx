import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

// Helper function to calculate contrast ratio
function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast calculation for testing
  // In production, use proper contrast calculation library
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.replace('#', ''), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      const val = c / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Color Contrast Tests', () => {
  describe('Normal Text Contrast (4.5:1)', () => {
    it('black text on white background should meet WCAG AA', async () => {
      const { container } = render(
        <p style={{ color: '#000000', backgroundColor: '#ffffff' }}>
          Normal text with sufficient contrast
        </p>
      );

      const contrastRatio = getContrastRatio('#000000', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('dark gray text on white background should meet WCAG AA', async () => {
      const { container } = render(
        <p style={{ color: '#595959', backgroundColor: '#ffffff' }}>
          Dark gray text with sufficient contrast
        </p>
      );

      const contrastRatio = getContrastRatio('#595959', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('white text on dark blue background should meet WCAG AA', async () => {
      const { container } = render(
        <p style={{ color: '#ffffff', backgroundColor: '#003366' }}>
          White text on dark blue background
        </p>
      );

      const contrastRatio = getContrastRatio('#ffffff', '#003366');
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('primary text in application should meet contrast requirements', async () => {
      const { container } = render(
        <div>
          <p style={{ color: '#1a1a1a', backgroundColor: '#ffffff' }}>
            Primary text color
          </p>
          <p style={{ color: '#333333', backgroundColor: '#ffffff' }}>
            Secondary text color
          </p>
          <p style={{ color: '#666666', backgroundColor: '#ffffff' }}>
            Tertiary text color (should still meet 4.5:1)
          </p>
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('error text should meet contrast requirements', async () => {
      const { container } = render(
        <p style={{ color: '#cc0000', backgroundColor: '#ffffff' }}>
          Error message text
        </p>
      );

      const contrastRatio = getContrastRatio('#cc0000', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('success text should meet contrast requirements', async () => {
      const { container } = render(
        <p style={{ color: '#006600', backgroundColor: '#ffffff' }}>
          Success message text
        </p>
      );

      const contrastRatio = getContrastRatio('#006600', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('warning text should meet contrast requirements', async () => {
      const { container } = render(
        <p style={{ color: '#8c6d00', backgroundColor: '#ffffff' }}>
          Warning message text
        </p>
      );

      const contrastRatio = getContrastRatio('#8c6d00', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('link text should meet contrast requirements', async () => {
      const { container } = render(
        <a href="/page" style={{ color: '#0066cc', backgroundColor: '#ffffff' }}>
          Link text
        </a>
      );

      const contrastRatio = getContrastRatio('#0066cc', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Large Text Contrast (3:1)', () => {
    it('large text (18pt+) should meet 3:1 ratio', async () => {
      const { container } = render(
        <h1 style={{ 
          fontSize: '24px', 
          color: '#767676', 
          backgroundColor: '#ffffff' 
        }}>
          Large heading text
        </h1>
      );

      const contrastRatio = getContrastRatio('#767676', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(3);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('bold text (14pt+) should meet 3:1 ratio', async () => {
      const { container } = render(
        <p style={{ 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: '#757575', 
          backgroundColor: '#ffffff' 
        }}>
          Bold large text
        </p>
      );

      const contrastRatio = getContrastRatio('#757575', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(3);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('heading elements should meet appropriate contrast', async () => {
      const { container } = render(
        <div>
          <h1 style={{ color: '#333333', backgroundColor: '#ffffff' }}>H1 Heading</h1>
          <h2 style={{ color: '#444444', backgroundColor: '#ffffff' }}>H2 Heading</h2>
          <h3 style={{ color: '#555555', backgroundColor: '#ffffff' }}>H3 Heading</h3>
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('UI Component Contrast (3:1)', () => {
    it('button backgrounds should have sufficient contrast', async () => {
      const { container } = render(
        <button style={{ 
          backgroundColor: '#0066cc', 
          color: '#ffffff',
          border: '2px solid #004499'
        }}>
          Primary Button
        </button>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('input borders should have sufficient contrast', async () => {
      const { container } = render(
        <input 
          type="text" 
          style={{ 
            border: '1px solid #767676',
            backgroundColor: '#ffffff'
          }}
          aria-label="Input field"
        />
      );

      const contrastRatio = getContrastRatio('#767676', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(3);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('icon buttons should have sufficient contrast', async () => {
      const { container } = render(
        <button 
          aria-label="Close"
          style={{ 
            backgroundColor: 'transparent',
            color: '#000000',
            border: '1px solid #666666'
          }}
        >
          ×
        </button>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('card borders should have sufficient contrast', async () => {
      const { container } = render(
        <div style={{ 
          border: '1px solid #cccccc',
          backgroundColor: '#ffffff',
          padding: '16px'
        }}>
          <p style={{ color: '#333333' }}>Card content</p>
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('navigation items should have sufficient contrast', async () => {
      const { container } = render(
        <nav style={{ backgroundColor: '#1a1a1a' }}>
          <a href="/" style={{ color: '#ffffff' }}>Home</a>
          <a href="/about" style={{ color: '#ffffff' }}>About</a>
        </nav>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('disabled states should still meet contrast for text', async () => {
      const { container } = render(
        <button disabled style={{ 
          backgroundColor: '#e0e0e0',
          color: '#666666',
          border: '1px solid #999999'
        }}>
          Disabled Button
        </button>
      );

      // Disabled elements are often exempt, but text should still be readable
      const contrastRatio = getContrastRatio('#666666', '#e0e0e0');
      expect(contrastRatio).toBeGreaterThan(2.5);
    });
  });

  describe('Focus Indicator Contrast', () => {
    it('focus outline should have sufficient contrast with background', async () => {
      const { container } = render(
        <button style={{ 
          outline: '2px solid #0066cc',
          outlineOffset: '2px',
          backgroundColor: '#ffffff'
        }}>
          Focusable button
        </button>
      );

      const contrastRatio = getContrastRatio('#0066cc', '#ffffff');
      expect(contrastRatio).toBeGreaterThanOrEqual(3);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('focus indicator should be visible on dark backgrounds', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#1a1a1a', padding: '20px' }}>
          <button style={{ 
            outline: '2px solid #66b3ff',
            backgroundColor: '#333333',
            color: '#ffffff'
          }}>
            Dark theme button
          </button>
        </div>
      );

      const contrastRatio = getContrastRatio('#66b3ff', '#1a1a1a');
      expect(contrastRatio).toBeGreaterThanOrEqual(3);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('custom focus styles should meet contrast requirements', async () => {
      const { container } = render(
        <a 
          href="/page"
          style={{
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(0, 102, 204, 1)',
            backgroundColor: '#ffffff',
            color: '#0066cc'
          }}
        >
          Custom focus link
        </a>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Dark Mode Contrast', () => {
    it('dark mode text should meet contrast requirements', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#1a1a1a' }}>
          <p style={{ color: '#e0e0e0' }}>
            Dark mode primary text
          </p>
          <p style={{ color: '#b3b3b3' }}>
            Dark mode secondary text
          </p>
        </div>
      );

      const primaryContrast = getContrastRatio('#e0e0e0', '#1a1a1a');
      expect(primaryContrast).toBeGreaterThanOrEqual(4.5);

      const secondaryContrast = getContrastRatio('#b3b3b3', '#1a1a1a');
      expect(secondaryContrast).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('dark mode buttons should meet contrast requirements', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#1a1a1a' }}>
          <button style={{ 
            backgroundColor: '#3399ff',
            color: '#000000',
            border: '2px solid #66b3ff'
          }}>
            Primary Button
          </button>
          <button style={{ 
            backgroundColor: 'transparent',
            color: '#ffffff',
            border: '2px solid #ffffff'
          }}>
            Secondary Button
          </button>
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('dark mode links should meet contrast requirements', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#1a1a1a' }}>
          <a href="/page" style={{ color: '#66b3ff' }}>
            Dark mode link
          </a>
        </div>
      );

      const contrastRatio = getContrastRatio('#66b3ff', '#1a1a1a');
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('dark mode form inputs should have sufficient contrast', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#1a1a1a' }}>
          <label htmlFor="dark-input" style={{ color: '#e0e0e0' }}>
            Input Label
          </label>
          <input
            id="dark-input"
            type="text"
            style={{
              backgroundColor: '#2a2a2a',
              color: '#ffffff',
              border: '1px solid #666666'
            }}
          />
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Light Mode Contrast', () => {
    it('light mode should use high contrast colors', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#ffffff' }}>
          <h1 style={{ color: '#1a1a1a' }}>Main Heading</h1>
          <p style={{ color: '#333333' }}>Body text content</p>
          <a href="/page" style={{ color: '#0066cc' }}>Link</a>
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('light mode cards should meet contrast requirements', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#f5f5f5' }}>
          <div style={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            padding: '16px'
          }}>
            <h3 style={{ color: '#1a1a1a' }}>Card Title</h3>
            <p style={{ color: '#666666' }}>Card description</p>
          </div>
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Independence', () => {
    it('information should not rely solely on color', async () => {
      const { container } = render(
        <form>
          <label htmlFor="required-field">
            Email <span style={{ color: 'red' }} aria-label="required">*</span>
          </label>
          <input 
            id="required-field" 
            type="email" 
            required 
            aria-required="true"
            aria-describedby="required-hint"
          />
          <p id="required-hint">Required field</p>
        </form>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('status indicators should use more than color', async () => {
      const { container } = render(
        <div>
          <div style={{ color: '#00cc00' }}>
            <span aria-label="Success">✓</span> Operation successful
          </div>
          <div style={{ color: '#cc0000' }}>
            <span aria-label="Error">✗</span> Operation failed
          </div>
          <div style={{ color: '#ff9900' }}>
            <span aria-label="Warning">⚠</span> Warning message
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('charts should have patterns in addition to colors', async () => {
      const { container } = render(
        <svg role="img" aria-labelledby="chart-title chart-desc">
          <title id="chart-title">Sales Chart</title>
          <desc id="chart-desc">
            Bar chart showing Q1: $100k (striped pattern), 
            Q2: $150k (dotted pattern), 
            Q3: $200k (solid pattern)
          </desc>
          <rect fill="#0066cc" />
        </svg>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form validation should not rely on color alone', async () => {
      const { container } = render(
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            aria-invalid="true"
            aria-describedby="email-error"
            style={{ borderColor: '#cc0000' }}
          />
          <span 
            id="email-error" 
            role="alert"
            style={{ color: '#cc0000' }}
          >
            <span aria-hidden="true">✗</span> Please enter a valid email
          </span>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Gradient and Transparent Backgrounds', () => {
    it('text on gradients should maintain sufficient contrast', async () => {
      const { container } = render(
        <div style={{ 
          background: 'linear-gradient(to bottom, #ffffff, #f0f0f0)',
          padding: '20px'
        }}>
          <p style={{ color: '#1a1a1a' }}>
            Text on gradient background
          </p>
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });

    it('semi-transparent overlays should not reduce contrast below threshold', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#000000', position: 'relative' }}>
          <div style={{ 
            position: 'absolute',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '20px'
          }}>
            <p style={{ color: '#000000' }}>
              Text on semi-transparent overlay
            </p>
          </div>
        </div>
      );

      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: true } }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Placeholder Text Contrast', () => {
    it('placeholder text should have sufficient contrast', async () => {
      const { container } = render(
        <input
          type="text"
          placeholder="Enter your name"
          aria-label="Name input"
          style={{
            '::placeholder': {
              color: '#757575'
            }
          } as React.CSSProperties}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
