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
    screens: {
      'xxs': '340px',    // Z Fold 5 front screen (344px) + safety margin
      'xs': '400px',      // Small phones
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      // Fluid typography that scales down for narrow screens
      fontSize: {
        'fluid-xs': 'clamp(0.65rem, 2vw, 0.75rem)',
        'fluid-sm': 'clamp(0.75rem, 2.5vw, 0.875rem)',
        'fluid-base': 'clamp(0.875rem, 3vw, 1rem)',
        'fluid-lg': 'clamp(1rem, 3.5vw, 1.125rem)',
        'fluid-xl': 'clamp(1.125rem, 4vw, 1.25rem)',
        'fluid-2xl': 'clamp(1.25rem, 5vw, 1.5rem)',
        'fluid-3xl': 'clamp(1.5rem, 6vw, 1.875rem)',
        'fluid-4xl': 'clamp(1.75rem, 7vw, 2.25rem)',
        'fluid-5xl': 'clamp(2rem, 8vw, 3rem)',
      },
      // Tighter spacing for narrow screens
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
    },
  },
  plugins: [],
}
