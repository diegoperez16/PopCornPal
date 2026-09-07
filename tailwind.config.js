/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: { 50: '#f8f5ef', 100: '#edeae4', 200: '#dedbd5', 300: '#c7c5c4', 400: '#aaa8af', 500: '#929099', 600: '#74737e', 700: '#383a40', 800: '#1c1e22', 900: '#101113', 950: '#0d0e10' },
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
    },
  },
  plugins: [],
}
