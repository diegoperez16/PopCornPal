/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cool slate ramp: modern film-app darks; the pal's butter and coral
        // stay as the only warm accents so the mascot pops.
        gray: { 50: '#f4f7f9', 100: '#e6ebef', 200: '#cfd8df', 300: '#aab8c2', 400: '#8595a4', 500: '#6b7c8c', 600: '#51606e', 700: '#2c3440', 800: '#1b2127', 900: '#14181c', 950: '#0e1114' },
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
