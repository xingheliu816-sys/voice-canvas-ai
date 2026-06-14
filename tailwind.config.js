/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        surface: {
          deep: '#0a0a0b',
          base: '#121214',
          DEFAULT: '#1a1a1d',
          elevated: '#222226',
          overlay: '#2a2a2f',
        },
        accent: {
          primary: '#ff5c3c',
          secondary: '#5b9cf5',
          emerald: '#34d399',
          amber: '#fbbf24',
        },
        warm: {
          light: '#eee8dc',
          muted: '#9d9788',
          dark: '#635f55',
        },
      },
      borderRadius: {
        xs: '4px',
      },
      animation: {
        'rotate-glow': 'rotate-glow 3s linear infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'breathe': 'breathe 2s ease-in-out infinite',
        'slide-up': 'slide-up 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slide-in-right 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 250ms ease-out forwards',
        'scale-in': 'scale-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
