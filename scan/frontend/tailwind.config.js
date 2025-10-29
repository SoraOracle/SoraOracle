/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        's402-dark': '#0A0A0A',
        's402-orange': '#F97316',
        's402-gray': '#1A1A1A',
        's402-light-bg': '#F5F5F7',
        's402-light-card': '#FFFFFF',
        's402-dark-bg': '#1C1C1E',
        's402-dark-card': '#2C2C2E',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
