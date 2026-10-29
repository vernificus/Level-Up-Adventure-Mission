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
