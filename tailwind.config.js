/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBFAF5',
        ink: '#152238',
        inkmuted: '#4B5768',
        accent: '#0F7B6C',
        accentdeep: '#0B5C51',
        rust: '#B84A25',
        line: '#E3E0D6',
      },
      fontFamily: {
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '44rem',
      },
    },
  },
  plugins: [],
}
