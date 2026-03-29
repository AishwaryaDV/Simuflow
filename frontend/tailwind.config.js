/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg:       'var(--app-bg)',
          surface:  'var(--app-surface)',
          elevated: 'var(--app-elevated)',
          border:   'var(--app-border)',
          accent:   'var(--app-accent)',
          'accent-dim': 'var(--app-accent-dim)',
          text:     'var(--app-text)',
          'text-2': 'var(--app-text-2)',
          'text-3': 'var(--app-text-3)',
        },
      },
    },
  },
  plugins: [],
}
