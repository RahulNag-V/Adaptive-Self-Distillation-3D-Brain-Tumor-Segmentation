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
        // Dark Premium + Clinical Hybrid Color System
        clinical: {
          bg: '#080B12',              // Primary background
          surface: '#101722',         // Secondary background / sidebar / panels
          card: '#151E2B',            // Surface base (cards, modals)
          cardHover: '#1B2635',       // Elevated surface on hover
          elevated: '#1B2635',        // Floating panels, popovers, dropdowns
          active: '#223246',          // Active states & selections
          border: '#243348',          // Standard borders
          borderSubtle: '#1C2636',    // Subtle dividers
          borderHover: '#324560',     // Interactive border hover
          text: '#F4F7FC',            // Primary text (High contrast, passes AAA)
          muted: '#9BA9BA',           // Secondary text (Passes AAA)
          tertiary: '#8496AC',        // Tertiary captions & keyboard badges (WCAG AA compliant: > 6.5:1)
          primary: '#4C8DFF',         // Primary accent (Radiology Blue)
          primaryHover: '#3A7AEB',    // Primary hover
          secondary: '#35C6B0',       // Secondary accent (Cyan / Sagittal)
          secondaryHover: '#2BB09C',  // Secondary hover
          success: '#35B982',         // Success / Ground truth
          warning: '#F4B860',         // Warning / Review queue
          error: '#F16C75',           // Error / Alerts
        },

        // Harmonized medical tokens (Full backward compatibility for existing components)
        medical: {
          bg: '#080B12',
          card: '#151E2B',
          surface: '#101722',
          surfaceHover: '#1B2635',
          navActive: '#223246',
          border: '#243348',
          borderHover: '#324560',
          text: '#F4F7FC',
          muted: '#9BA9BA',
          primary: '#4C8DFF',
          primaryHover: '#3A7AEB',
          secondary: '#35C6B0',
          secondaryHover: '#2BB09C',
          success: '#35B982',
          warning: '#F4B860',
          error: '#F16C75',
          darkest: '#080B12',
          base: '#151E2B',
          cardHover: '#1B2635',
          borderLight: '#1C2636',
          teal: '#35C6B0',
          tealLight: '#4EE0CA',
          cyan: '#38BDF8',
          cyanLight: '#7DD3FC',
          blue: '#4C8DFF',
          blueLight: '#70A4FF',
          navy: '#080B12',
        },

        // Dark MRI Workstation Environment (Preserved for imaging contrast)
        mri: {
          bg: '#080B12',
          surface: '#101722',
          surfaceHover: '#1B2635',
          card: '#151E2B',
          border: '#243348',
          borderLight: '#324560',
          text: '#F4F7FC',
          muted: '#9BA9BA',
          accent: '#4C8DFF',
          accentHover: '#3A7AEB',
        },

        // BraTS Tumor Compartment Segmentation Masks
        tumor: {
          wt: '#EAB308', // Whole Tumor (Yellow / Edema infiltration)
          tc: '#F43F5E', // Tumor Core (Coral / Necrotic)
          et: '#06B6D4', // Enhancing Active Tumor (Cyan)
          ed: '#10B981', // Peritumoral Edema (Emerald)
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        // Preserved existing utilities (updated to dark clinical elevation values)
        'medical-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        'medical-md': '0 4px 8px -2px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'medical-lg': '0 12px 24px -4px rgba(0, 0, 0, 0.55), 0 4px 8px -4px rgba(0, 0, 0, 0.3)',
        'medical-card': '0 0 0 1px rgba(255, 255, 255, 0.04), 0 2px 4px rgba(0, 0, 0, 0.4)',
        'mri-viewer': '0 12px 32px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        // New clinical tokens
        'clinical-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        'clinical-md': '0 4px 8px -2px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'clinical-lg': '0 12px 24px -4px rgba(0, 0, 0, 0.55), 0 4px 8px -4px rgba(0, 0, 0, 0.3)',
        'clinical-card': '0 0 0 1px rgba(255, 255, 255, 0.04), 0 2px 4px rgba(0, 0, 0, 0.4)',
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
