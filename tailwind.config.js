/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,njk,js}",
    "./_site/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        'seo-green': '#10b981',
        'seo-yellow': '#f59e0b',
        'seo-red': '#ef4444',
      }
    },
  },
  plugins: [],
}

