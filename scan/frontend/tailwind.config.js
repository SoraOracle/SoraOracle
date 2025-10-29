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
      },
    },
  },
  plugins: [],
};
