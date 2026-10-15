/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        medical: {
          darkest: '#030712',
          base: '#0B0F17',
          surface: '#111827',
          card: '#151E2E',
          cardHover: '#1B273B',
          border: '#1F2E45',
          borderLight: '#2D3F5A',
          teal: '#0D9488',
          tealLight: '#14B8A6',
          cyan: '#06B6D4',
          cyanLight: '#22D3EE',
          blue: '#0284C7',
          blueLight: '#38BDF8',
          navy: '#0F172A',
          muted: '#94A3B8',
          text: '#F1F5F9',
        },
        tumor: {
          wt: '#10B981', // Whole Tumor (green/emerald)
          tc: '#F59E0B', // Tumor Core (amber/orange)
          et: '#EF4444', // Enhancing Tumor (red/coral)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
