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
        // Primary Medical Light Theme (Application Shell, Dashboard, Forms, Reports)
        medical: {
          bg: '#F7FAFC',
          card: '#FFFFFF',
          surface: '#EEF4F8',
          surfaceHover: '#EAF2FF',
          navActive: '#E3EEFF',
          border: '#DCE6F0',
          borderHover: '#CBD5E1',
          text: '#16324F',
          muted: '#64748B',
          primary: '#2563EB',
          primaryHover: '#1D4ED8',
          secondary: '#06B6D4',
          secondaryHover: '#0891B2',
          success: '#16866A',
          warning: '#B7791F',
          error: '#C24141',

          // Retain harmonized tokens for backward compatibility
          darkest: '#F7FAFC',
          base: '#FFFFFF',
          cardHover: '#F1F5F9',
          borderLight: '#E2E8F0',
          teal: '#2563EB',
          tealLight: '#3B82F6',
          cyan: '#06B6D4',
          cyanLight: '#0891B2',
          blue: '#2563EB',
          blueLight: '#60A5FA',
          navy: '#16324F',
        },

        // Dedicated Dark MRI Workstation Environment (Preserved for imaging contrast)
        mri: {
          bg: '#101B2D',
          surface: '#18263B',
          surfaceHover: '#22354D',
          card: '#18263B',
          border: '#30445E',
          borderLight: '#3F5877',
          text: '#F1F5F9',
          muted: '#A7B5C8',
          accent: '#7DD3FC',
          accentHover: '#38BDF8',
        },

        // BraTS Tumor Compartment Segmentation Masks
        tumor: {
          wt: '#10B981', // Whole Tumor (green/emerald)
          tc: '#F59E0B', // Tumor Core (amber/orange)
          et: '#EF4444', // Enhancing Tumor (red/coral)
          ed: '#059669', // Peritumoral Edema
        }
      },
      fontFamily: {
        sans: ['"Times New Roman"', 'Times', 'Georgia', 'serif', 'Inter', 'sans-serif'],
        serif: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'medical-sm': '0 1px 2px 0 rgba(22, 50, 79, 0.05)',
        'medical-md': '0 4px 6px -1px rgba(22, 50, 79, 0.07), 0 2px 4px -2px rgba(22, 50, 79, 0.05)',
        'medical-lg': '0 10px 15px -3px rgba(22, 50, 79, 0.08), 0 4px 6px -4px rgba(22, 50, 79, 0.04)',
        'medical-card': '0 1px 3px 0 rgba(22, 50, 79, 0.04), 0 1px 2px -1px rgba(22, 50, 79, 0.04)',
        'mri-viewer': '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'page-in': 'pageIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fadeIn': 'fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dropdown-down': 'dropdownSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dropdown-up': 'dropdownSlideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        pageIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        dropdownSlideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        dropdownSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      }
    },
  },
  plugins: [],
}
