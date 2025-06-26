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
        background: {
          light: "#F9FAFB",
          DEFAULT: "#FFFFFF",
          dark: "#F1F3F5",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F4F5F7",
        },
        primary: {
          DEFAULT: "#2D2D2D",
          light: "#4A4A4A",
          muted: "#6B6B6B",
        },
        accent: {
          DEFAULT: "#00AFB9",
          hover:   "#008A8F",
        },
        foreground: {
          light: "#2D2D2D",
          dark: "#FFFFFF",
        },
        neutral: {
          900: '#1F2D3D',
          700: '#4B5563',
          400: '#E5E7EB',
          100: '#F8FAFC',
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
        card: "0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};