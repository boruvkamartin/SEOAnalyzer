/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,njk,js}",
    "./_site/**/*.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'seo-green': '#10b981',
        'seo-yellow': '#f59e0b',
        'seo-red': '#ef4444',
        'dark': {
          'bg': '#0a0e27',
          'surface': '#131829',
          'surface-hover': '#1a1f35',
          'border': '#1e2439',
          'text': '#e2e8f0',
          'text-muted': '#94a3b8',
          'primary': '#6366f1',
          'primary-hover': '#818cf8',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}

