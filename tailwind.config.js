/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Brand theme: navy-tinted neutrals replace the default slate scale so
      // every existing `slate-*` utility picks up the new palette.
      colors: {
        slate: {
          50: '#F6F7FB',
          100: '#EEF0F6',
          200: '#E1E5F0',
          300: '#C9D0E3',
          400: '#8F98B8',
          500: '#5D6687',
          600: '#4A5270',
          700: '#3D4566',
          800: '#2A3560',
          900: '#1B2340',
          950: '#121830',
        },
        blue: {
          50: '#EEF3FF',
          100: '#DCE5FF',
          200: '#BCCBFB',
          300: '#93AAF6',
          400: '#6A88F1',
          500: '#4C72F0',
          600: '#2F5BEA',
          700: '#2448C9',
          800: '#1E3AA0',
          900: '#1B2F7A',
          950: '#141F4D',
        },
        // The stock 600 shades of these hues fail WCAG AA (4.5:1) with white
        // text. They are used as solid fills for buttons, badges and the
        // category/guild colours teachers save, so deepen them to pass.
        green: { 600: '#15803D' },
        emerald: { 600: '#047857' },
        teal: { 600: '#0F766E' },
        cyan: { 600: '#0E7490' },
        sky: { 600: '#0369A1' },
        orange: { 600: '#C2410C' },
        amber: { 600: '#B45309' },
        yellow: { 600: '#A16207' },
        lime: { 600: '#4D7C0F' },
        pink: { 600: '#BE185D' },
        fuchsia: { 600: '#A21CAF' },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Fredoka', '"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
};
