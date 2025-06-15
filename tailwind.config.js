/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './frontend/pages/**/*.{js,ts,jsx,tsx}',
    './frontend/components/**/*.{js,ts,jsx,tsx}',
    './frontend/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0055A5',
          light: '#3380C2',
          dark: '#003366',
        },
        accent: {
          DEFAULT: '#FFC200',
          light: '#FFE066',
          dark: '#CC9900',
        },
        neutral: {
          900: '#1F2D3D',
          700: '#4B5563',
          400: '#E5E7EB',
          100: '#F8FAFC',
        },
        background: {
          light: '#F8FAFC',
          dark: '#1F2D3D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(31,45,61,0.08)',
      },
    },
  },
  plugins: [],
};