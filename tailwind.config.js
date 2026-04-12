/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        // ── Mistral Warm Surfaces ──────────────────────────────────────────
        'background':                '#1f1f1f',   // Mistral Black
        'surface':                   '#1f1f1f',
        'surface-dim':               '#161616',
        'surface-container-lowest':  '#111111',
        'surface-container-low':     '#1a1a1a',
        'surface-container':         '#252525',
        'surface-container-high':    '#2e2e2e',
        'surface-container-highest': '#383838',
        'surface-bright':            '#3a3a3a',
        'surface-variant':           '#2e2e2e',
        'inverse-surface':           '#f5f0eb',
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
        // ── Text ──────────────────────────────────────────────────────────
        'on-surface':                '#f5f0eb',   // Warm white
        'on-surface-variant':        '#b0a89e',   // Warm gray
        'on-background':             '#f5f0eb',
        'inverse-on-surface':        '#4a4035',
        // ── Outlines ──────────────────────────────────────────────────────
        'outline':                   '#6b5f54',
        'outline-variant':           '#3a3028',   // Warm dark outline
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

