/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // ── Paleta Gatocafee ──
      colors: {
        cafe: {
          50:  '#fdf6f0',
          100: '#f5e6d3',
          200: '#e8c9a0',
          300: '#d4a574',
          400: '#c0834a',
          500: '#a0522d',  // café principal
          600: '#8b4513',
          700: '#6b3410',
          800: '#4a2c2a',  // oscuro
          900: '#2d1b1a',
        },
        crema: {
          50:  '#fffdf9',
          100: '#fef9f0',
          200: '#fdf0da',
          300: '#fae4be',
          400: '#f5d49a',
          500: '#edc47a',
        },
        exito: '#2d7a4f',
        alerta: '#b45309',
        error:  '#b91c1c',
      },
      // ── Tipografía ──
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      // ── Sombras personalizadas ──
      boxShadow: {
        'cafe-sm': '0 2px 8px rgba(74, 44, 42, 0.12)',
        'cafe':    '0 4px 20px rgba(74, 44, 42, 0.18)',
        'cafe-lg': '0 8px 40px rgba(74, 44, 42, 0.25)',
        'glow':    '0 0 20px rgba(160, 82, 45, 0.3)',
      },
      // ── Animaciones ──
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulse_soft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease-out forwards',
        'slide-in':   'slideIn 0.3s ease-out forwards',
        'pulse-soft': 'pulse_soft 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite linear',
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        'cafe-gradient':    'linear-gradient(135deg, #4a2c2a 0%, #8b4513 50%, #a0522d 100%)',
        'crema-gradient':   'linear-gradient(135deg, #fdf6f0 0%, #f5e6d3 100%)',
      },
    },
  },
  plugins: [],
};
