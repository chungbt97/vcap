/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        // ── Mistral Warm Surfaces (theme-sensitive — driven by CSS variables) ──
        'background':                'rgb(var(--color-background) / <alpha-value>)',
        'surface':                   'rgb(var(--color-surface) / <alpha-value>)',
        'surface-dim':               'rgb(var(--color-surface-dim) / <alpha-value>)',
        'surface-container-lowest':  'rgb(var(--color-surface-container-lowest) / <alpha-value>)',
        'surface-container-low':     'rgb(var(--color-surface-container-low) / <alpha-value>)',
        'surface-container':         'rgb(var(--color-surface-container) / <alpha-value>)',
        'surface-container-high':    'rgb(var(--color-surface-container-high) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--color-surface-container-highest) / <alpha-value>)',
        'surface-bright':            'rgb(var(--color-surface-bright) / <alpha-value>)',
        'surface-variant':           'rgb(var(--color-surface-variant) / <alpha-value>)',
        'inverse-surface':           'rgb(var(--color-inverse-surface) / <alpha-value>)',
        // ── Mistral Orange primary ─────────────────────────────────────────
        'primary':                   '#fa520f',   // Mistral Orange
        'primary-dim':               '#fb6424',   // Flame
        'primary-container':         '#ff8105',   // Block Orange
        'primary-fixed':             '#ffa110',   // Sunshine 700
        'primary-fixed-dim':         '#ff8a00',   // Sunshine 900
        'on-primary':                '#ffffff',
        'on-primary-container':      '#1f1f1f',
        'on-primary-fixed':          '#1f1f1f',
        'on-primary-fixed-variant':  '#3a0f00',
        'inverse-primary':           '#c73c00',
        // ── Mistral Amber secondary ────────────────────────────────────────
        'secondary':                 '#ffa110',   // Sunshine 700
        'secondary-dim':             '#ff8a00',   // Sunshine 900
        'secondary-container':       '#ffb83e',   // Sunshine 500
        'secondary-fixed':           '#ffd06a',   // Sunshine 300
        'secondary-fixed-dim':       '#ffe295',   // Block Gold
        'on-secondary':              '#1f1f1f',
        'on-secondary-container':    '#1f1f1f',
        'on-secondary-fixed':        '#1f1f1f',
        'on-secondary-fixed-variant': '#4a2800',
        // ── Tertiary (Yellow) ──────────────────────────────────────────────
        'tertiary':                  '#ffd900',   // Bright Yellow
        'tertiary-dim':              '#ffe295',
        'tertiary-container':        '#fff0c2',   // Cream
        'tertiary-fixed':            '#fffaeb',   // Warm Ivory
        'tertiary-fixed-dim':        '#ffd900',
        'on-tertiary':               '#1f1f1f',
        'on-tertiary-container':     '#1f1f1f',
        'on-tertiary-fixed':         '#1f1f1f',
        'on-tertiary-fixed-variant': '#4a3c00',
        // ── Error ─────────────────────────────────────────────────────────
        'error':                     '#ff716c',
        'error-dim':                 '#d7383b',
        'error-container':           '#7a0011',
        'on-error':                  '#ffffff',
        'on-error-container':        '#ffd2cc',
        // ── Text (theme-sensitive — driven by CSS variables) ─────────────────
        'on-surface':                'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-surface-variant':        'rgb(var(--color-on-surface-variant) / <alpha-value>)',
        'on-background':             'rgb(var(--color-on-background) / <alpha-value>)',
        'inverse-on-surface':        'rgb(var(--color-inverse-on-surface) / <alpha-value>)',
        // ── Outlines (theme-sensitive — driven by CSS variables) ─────────────
        'outline':                   'rgb(var(--color-outline) / <alpha-value>)',
        'outline-variant':           'rgb(var(--color-outline-variant) / <alpha-value>)',
        // ── Tints ─────────────────────────────────────────────────────────
        'surface-tint':              '#fa520f',
      },
      borderRadius: {
        DEFAULT: '0.25rem',  // 4px — sharp Mistral geometry
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.375rem',
        xl: '0.5rem',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Space Grotesk', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        // Mistral golden shadow — warm amber-tinted
        'warm-sm': 'rgba(127, 99, 21, 0.12) 0px 4px 16px',
        'warm': 'rgba(127, 99, 21, 0.12) -8px 16px 39px, rgba(127, 99, 21, 0.08) -20px 40px 60px',
        'warm-lg': 'rgba(127, 99, 21, 0.12) -8px 16px 39px, rgba(127, 99, 21, 0.10) -33px 64px 72px, rgba(127, 99, 21, 0.06) -73px 144px 97px',
      },
    },
  },
  plugins: [],
}

