/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        black: '#0B0B0D',
        surface: '#1A1C1F',
        'surface-light': '#212428',
        border: '#2A2D32',
        frost: '#D9E1E8',
        blue: '#4BA3FF',
        gold: '#D6A756',
        red: '#A12727',
        muted: '#5A6070',
      },
    },
  },
  plugins: [],
};
