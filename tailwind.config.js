/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm espresso ramp: the whole app inherits the buttered-cinema
        // palette through these instead of cool blue-grays.
        gray: { 50: '#faf5ea', 100: '#f0e7d6', 200: '#ded2ba', 300: '#c2b298', 400: '#a4947a', 500: '#8b7c66', 600: '#6d604c', 700: '#413526', 800: '#251e14', 900: '#17120d', 950: '#100c08' },
        butter: { 300: '#ffd97e', 400: '#f6cd66', 500: '#eab84f', 600: '#c99a3a' },
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
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
