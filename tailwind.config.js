/** @type {import('tailwindcss').Config} */

// Every colour resolves through a CSS variable holding "R G B" channels, so a
// theme can repaint the app by redefining those variables alone. The channel
// form is what lets Tailwind's opacity modifiers (bg-surface/40) keep working.
const themed = (name) => `rgb(var(--pp-${name}-rgb) / <alpha-value>)`

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50: themed('gray-50'), 100: themed('gray-100'), 200: themed('gray-200'),
          300: themed('gray-300'), 400: themed('gray-400'), 500: themed('gray-500'),
          600: themed('gray-600'), 700: themed('gray-700'), 800: themed('gray-800'),
          900: themed('gray-900'), 950: themed('gray-950'),
        },
        accent: {
          DEFAULT: themed('accent'),
          soft: themed('accent-soft'),
          warm: themed('accent-warm'),
          bright: themed('accent-bright'),
          deep: themed('accent-deep'),
          on: themed('on-accent'),
        },
        butter: {
          300: themed('butter-300'), 400: themed('butter-400'),
          500: themed('butter-500'), 600: themed('butter-600'),
          gold: themed('butter-gold'),
        },
        surface: {
          DEFAULT: themed('surface'),
          strong: themed('surface-strong'),
          sunken: themed('surface-sunken'),
          raised: themed('surface-raised'),
        },
        line: { DEFAULT: themed('line'), soft: themed('line-soft'), strong: themed('line-strong') },
        ink: themed('ink'),
        muted: themed('muted'),
        parchment: themed('parchment'),
        // Kept for legacy markup that still references the old primary ramp.
        primary: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
      },
      fontFamily: {
        display: ['var(--pp-display)', 'Georgia', 'serif'],
        serif: ['var(--pp-display)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
