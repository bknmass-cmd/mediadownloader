/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        snapTeal: {
          light: '#22d3ee',
          DEFAULT: '#00bcd4',
          dark: '#0891b2'
        },
        snapYellow: {
          DEFAULT: '#fbc02d',
          hover: '#f9a825'
        }
      }
    },
  },
  plugins: [],
}
