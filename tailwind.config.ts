import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef0f8',
          100: '#d8dcef',
          200: '#b3bbdd',
          300: '#8a92c4',
          400: '#5f6aa6',
          500: '#3f4a87',
          600: '#2d3870',
          700: '#23295e',
          800: '#1e2461',
          900: '#181d4f',
          950: '#0F1535',
          975: '#0a0e26',
        },
        orange: {
          50: '#fef3ec',
          100: '#fde2d0',
          200: '#fbc2a2',
          300: '#f89a6b',
          400: '#f47644',
          500: '#E85D26',
          600: '#cf4a17',
          700: '#ac3914',
          800: '#892e15',
          900: '#702714',
        },
        gold: {
          50: '#fef8e7',
          100: '#fcebbf',
          200: '#f9d57f',
          300: '#f4ba3f',
          400: '#e29c17',
          500: '#C8820A',
          600: '#a36608',
          700: '#7d4d0a',
          800: '#5f3b0b',
        },
        teal: {
          50: '#e6f4f5',
          100: '#bee0e3',
          200: '#7fc1c8',
          300: '#3fa1ac',
          400: '#198494',
          500: '#006D77',
          600: '#005a63',
          700: '#00484f',
          800: '#00363b',
        },
        cream: {
          50: '#FFFFFF',
          100: '#FCFCFD',
          200: '#F7F8FA',
          300: '#E4E7EB',
          400: '#CBD0D6',
          500: '#A8AEB6',
        },
        charcoal: {
          DEFAULT: '#2E2E2E',
          light: '#666677',
        },
      },
      fontFamily: {
        display: ['Sora', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        enterprise: '0 10px 40px -10px rgba(30, 36, 97, 0.18)',
        'enterprise-lg': '0 30px 80px -20px rgba(30, 36, 97, 0.28)',
        'glow-orange': '0 0 32px -6px rgba(232, 93, 38, 0.45)',
        card: '0 1px 2px 0 rgba(15, 21, 53, 0.04), 0 1px 3px 0 rgba(15, 21, 53, 0.06)',
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
