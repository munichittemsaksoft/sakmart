/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Saksoft Brand Palette ──────────────────────
        primary: {
          50:  '#e6f0fb',
          100: '#c0d8f5',
          200: '#91bbee',
          300: '#5f9de7',
          400: '#2b7fdf',
          500: '#0057B8',   // Saksoft primary blue
          600: '#004da6',
          700: '#003f88',
          800: '#00306a',
          900: '#00224d',
        },
        accent: {
          50:  '#fff3ec',
          100: '#ffdfc6',
          200: '#ffc89e',
          300: '#ffb176',
          400: '#ff9a4e',
          500: '#FF823A',   // Saksoft orange (globe band)
          600: '#e57034',
          700: '#c95e2b',
          800: '#a04825',
          900: '#7a371d',
        },
        dark: {
          950: '#0A1628',   // Saksoft dark navy
          900: '#0F2040',
          800: '#1A3060',
          700: '#244070',
        },
        surface: {
          DEFAULT: '#ffffff',
          soft:    '#f0f5fb',
          muted:   '#e4edf8',
          border:  '#ccdcf0',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        card:  '0 1px 4px 0 rgba(0,87,184,0.06), 0 4px 16px 0 rgba(0,87,184,0.08)',
        hover: '0 4px 12px 0 rgba(0,87,184,0.14), 0 8px 32px 0 rgba(0,87,184,0.10)',
        modal: '0 16px 64px 0 rgba(0,0,0,0.24)',
      },
    },
  },
  plugins: [],
}
