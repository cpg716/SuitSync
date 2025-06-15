// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './pages/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        colors: {
          primary: '#0055A5',
          'primary-dark': '#004080',
          secondary: '#00A9E0',
          accent: '#FFC200',
          background: '#F9FAFB',
          neutral: {
            900: '#1F2D3D',
            700: '#4B5563',
            300: '#E5E7EB',
          },
        },
      },
    },
    plugins: [],
  };