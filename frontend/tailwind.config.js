/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // manual toggle
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: '#00ffff', // cyan neon
        magenta: '#ff00ff',
        darkBg: '#111111',
        accent: '#ff6ec7',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 5px #00ffff' },
          '50%': { boxShadow: '0 0 20px #00ffff' },
        },
      },
      animation: {
        pulseNeon: 'pulseNeon 2s infinite ease-in-out',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
