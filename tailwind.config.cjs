/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
    './hooks/**/*.{js,jsx,ts,tsx,mdx}',
    './lib/**/*.{js,jsx,ts,tsx,mdx}',
    './styles/**/*.{js,jsx,ts,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ==========================================
      // UNIFIED COLOR SYSTEM
      // Use 'zinc' as the standard neutral gray
      // ==========================================
      colors: {
        // Semantic accent colors from CSS variables
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          dark: 'var(--accent-dark)',
          glow: 'var(--accent-glow)',
          subtle: 'var(--accent-subtle)',
        },
        // Secondary accent colors
        'accent-green': {
          DEFAULT: 'var(--accent-green)',
          glow: 'var(--accent-green-glow)',
        },
        'accent-purple': {
          DEFAULT: 'var(--accent-purple)',
          glow: 'var(--accent-purple-glow)',
        },
        'accent-gold': {
          DEFAULT: 'var(--accent-gold)',
          glow: 'var(--accent-gold-glow)',
        },
        // Status colors
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        // Background colors
        dark: 'var(--bg-dark)',
        darker: 'var(--bg-darker)',
        panel: {
          DEFAULT: 'var(--bg-panel)',
          elevated: 'var(--bg-panel-elevated)',
          hover: 'var(--bg-panel-hover)',
        },
        // Glass morphism
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
          highlight: 'var(--glass-highlight)',
        },
        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        // Border colors
        border: {
          DEFAULT: 'var(--border)',
          accent: 'var(--border-accent)',
        },
      },
      // Box shadows from CSS variables
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        'glow-accent': '0 0 60px -12px rgba(0, 240, 255, 0.5)',
        'glow-green': '0 0 60px -12px rgba(0, 255, 136, 0.5)',
        'glow-purple': '0 0 60px -12px rgba(167, 139, 250, 0.5)',
      },
      // Animation timing
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Border radius consistency
      borderRadius: {
        'card': '14px',
        'button': '12px',
        'input': '10px',
      },
      // Font settings
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      // Spacing for consistent layouts
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      // Animation keyframes
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(0, 240, 255, 0.4)' },
          '50%': { boxShadow: '0 0 40px -5px rgba(0, 240, 255, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'shimmer': {
          '100%': { left: '100%' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
    },
  },
  plugins: [],
}
