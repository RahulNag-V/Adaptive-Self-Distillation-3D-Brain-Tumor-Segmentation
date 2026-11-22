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
        // Neuro Resonence AI Core Brand Palette
        'deep-mint': 'var(--app-background-deep-mint)',
        brand: {
          primary: '#399DBA',      // Primary Accent / Action Color / Highlight
          deep: '#103B5C',         // Deep Blue / Secondary Headings / Hover
          midnight: '#092B47',     // Midnight Blue / Executive Surfaces
          medical: '#164D70',      // Medical Blue / Supporting / Muted
          ocean: '#1B6284',        // Ocean Blue / Links / Interactive
          mint: '#98D9CE',         // Soft Deep Mint Accent / Borders
          decorative: '#6DBFD3',   // Decorative / Accent Text / Taglines
        },

        // Text Hierarchy Tokens
        nrai: {
          textPrimary: '#000000',
          heading: '#111827',
          body: '#25313D',
          secondary: '#103B5C',
          muted: '#164D70',
          link: '#1B6284',
          accent: '#399DBA',
          decorative: '#6DBFD3',
        },

        // Unified Palette Aliases
        palette: {
          deep: '#103B5C',         // Deep Blue
          sunset: '#399DBA',       // Primary Brand Blue
          primary: '#399DBA',
          amber: '#1B6284',        // Ocean Blue
          peach: '#98D9CE',        // Mint Accent
          pale: '#EBF8F6',         // Subtle Mint Surface
          white: '#FFFFFF',        // Solid Clean White
          slate: '#111827',        // Main Headings / Dark Slate
          sky: '#1B6284',
          cyan: '#399DBA',
          ice: '#EBF8F6',
          mint: '#98D9CE',
          midnight: '#092B47',
          medical: '#164D70',
          ocean: '#1B6284',
        },

        sunset: {
          50: '#F0FDF8',
          100: '#EBF8F6',
          200: '#CDEAE5',
          300: '#98D9CE',
          400: '#6DBFD3',
          500: '#399DBA',
          600: '#1B6284',
          700: '#164D70',
          800: '#103B5C',
          900: '#092B47',
          950: '#051827',
        },

        // Clinical Workstation Theme Tokens
        clinical: {
          bg: 'var(--app-background-deep-mint)',              // Consistent Deep Mint background
          surface: '#FFFFFF',         // Crisp white cards and surfaces
          card: '#FFFFFF',            // Card background
          cardSubtle: '#F8FCFB',      // Subtle clean surface tint
          cardHover: '#EBF8F6',       // Elevated surface on hover
          elevated: '#FFFFFF',        // Floating panels, popovers, dropdowns
          active: '#E6F7F5',          // Active states & selections
          sidebar: '#092B47',         // Midnight Blue executive sidebar
          sidebarHover: '#103B5C',
          sidebarActive: '#164D70',
          border: '#98D9CE',          // Subtle mint border
          borderSubtle: '#CDEAE5',    // Subtle dividers
          borderAccent: '#399DBA',    // Interactive brand border
          borderHover: '#103B5C',     // Border hover (deep blue)
          text: '#000000',            // Primary text (black)
          textDeep: '#111827',        // Headings (dark slate)
          muted: '#164D70',           // Supporting text (medical blue)
          tertiary: '#25313D',        // Body text
          primary: '#399DBA',         // Primary action (#399DBA)
          primaryHover: '#103B5C',    // Primary hover (#103B5C)
          secondary: '#103B5C',       // Secondary accent (Deep Blue)
          secondaryHover: '#399DBA',  // Secondary hover
          accent: '#399DBA',          // Accent highlight
          accentHover: '#103B5C',     // Accent hover
          ice: '#EBF8F6',             // Soft mint surface
          success: '#059669',         // Emerald green
          warning: '#D97706',         // Amber
          error: '#DC2626',           // Red
        },

        // Harmonized tokens mapped to Neuro Resonence AI Brand System
        medical: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          surface: '#FFFFFF',
          surfaceHover: '#F8FCFB',
          navActive: '#399DBA',
          border: '#98D9CE',
          borderHover: '#399DBA',
          text: '#000000',
          muted: '#164D70',
          primary: '#399DBA',
          primaryHover: '#103B5C',
          secondary: '#103B5C',
          secondaryHover: '#399DBA',
          success: '#059669',
          warning: '#D97706',
          error: '#DC2626',
          darkest: '#092B47',
          base: '#FFFFFF',
          cardHover: '#F8FCFB',
          borderLight: '#CDEAE5',
          teal: '#399DBA',
          tealLight: '#98D9CE',
          cyan: '#399DBA',
          cyanLight: '#EBF8F6',
          blue: '#103B5C',
          blueLight: '#1B6284',
          navy: '#092B47',
        },

        // Dark MRI Workstation Environment (Midnight Blue base)
        mri: {
          bg: '#092B47',
          surface: '#103B5C',
          surfaceHover: '#164D70',
          card: '#092B47',
          border: '#164D70',
          borderLight: '#1B6284',
          text: '#F9FAFB',
          muted: '#98D9CE',
          accent: '#399DBA',
          accentHover: '#6DBFD3',
        },

        // BraTS Tumor Compartment Segmentation Masks (Preserved medical meaning)
        tumor: {
          wt: '#EAB308', // Whole Tumor (Yellow / Edema infiltration)
          tc: '#EF4444', // Tumor Core (Coral / Necrotic)
          et: '#06B6D4', // Enhancing Active Tumor (Cyan)
          ed: '#10B981', // Peritumoral Edema (Emerald)
        }
      },
      backgroundImage: {
        'gradient-primary': '#399DBA',
        'gradient-accent': '#103B5C',
        'gradient-soft': '#FFFFFF',
        'gradient-soft-alt': '#F8FCFB',
        'gradient-subtle': '#EBF8F6',
        'gradient-sidebar': 'linear-gradient(180deg, #092B47 0%, #103B5C 100%)',
        'gradient-sunset': '#399DBA',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        audiowide: ['"Audiowide"', 'cursive', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'standard': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'elevated': '0 6px 18px rgba(0, 0, 0, 0.12)',
        'hover': '0 6px 18px rgba(0, 0, 0, 0.12)',
        'clinical-sm': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'clinical-md': '0 6px 18px rgba(0, 0, 0, 0.12)',
        'clinical-lg': '0 8px 24px rgba(0, 0, 0, 0.14)',
        'clinical-card': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'medical-sm': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'medical-md': '0 6px 18px rgba(0, 0, 0, 0.12)',
        'medical-lg': '0 8px 24px rgba(0, 0, 0, 0.14)',
        'medical-card': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'sunset-xs': '0 2px 6px rgba(0, 0, 0, 0.08)',
        'sunset-sm': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'sunset-md': '0 6px 18px rgba(0, 0, 0, 0.12)',
        'sunset-lg': '0 8px 24px rgba(0, 0, 0, 0.14)',
        'sunset-card': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'sunset-card-hover': '0 6px 18px rgba(0, 0, 0, 0.12)',
        'mri-viewer': '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 2px #111111',
      },
      animation: {
        'page-in': 'pageIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fadeIn': 'fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dropdown-down': 'dropdownSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dropdown-up': 'dropdownSlideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'accordion-down': 'accordionDown 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'accordion-up': 'accordionUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        accordionDown: {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        accordionUp: {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
        pageIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
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
