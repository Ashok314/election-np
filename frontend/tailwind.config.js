/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        current: 'currentColor',
        transparent: 'transparent',
        brand: {
          main: 'var(--primary-500)',
          light: 'var(--primary-100)',
          dark: 'var(--primary-700)',
        },
        surface: {
          main: 'var(--bg-main)',
          card: 'var(--bg-card)',
        },
        border: {
          default: 'var(--border-default)',
        },
        text: {
          main: 'var(--text-main)',
          muted: 'var(--text-muted)',
        },
        accent: {
          blue: 'var(--secondary-500)',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
      },
    },
  },
  plugins: [],
};
