import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Design system — Handball Pro v11
        // Base: OLED-friendly deep navy
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',

        // Text
        fg: 'hsl(var(--fg) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-fg': 'hsl(var(--muted-fg) / <alpha-value>)',

        // Brand
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          fg: 'hsl(var(--primary-fg) / <alpha-value>)',
        },

        // Semantic — dominio handball
        goal: 'hsl(var(--goal) / <alpha-value>)', // green — gol
        save: 'hsl(var(--save) / <alpha-value>)', // blue — atajada
        miss: 'hsl(var(--miss) / <alpha-value>)', // gray — errado
        danger: 'hsl(var(--danger) / <alpha-value>)', // red — error crítico / roja
        warning: 'hsl(var(--warning) / <alpha-value>)', // amber — sanción
        exclusion: 'hsl(var(--exclusion) / <alpha-value>)', // orange — 2 min
        card: 'hsl(var(--card) / <alpha-value>)', // purple — azul/amarilla

        // Court palette — handball-specific
        court: {
          bg: '#0b1a2e',
          area: '#1a3d7a',
          line: '#ffffff',
          selected: '#c8a82a',
          heat: '#ef6461',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 180ms ease-out',
        'pulse-live': 'pulse-live 1.2s ease-in-out infinite',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
