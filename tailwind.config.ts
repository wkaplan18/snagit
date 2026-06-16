import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sf-brand':       '#1A56DB',
        'sf-brand-dark':  '#1239A4',
        'sf-brand-light': '#EEF4FF',
        'sf-base':        '#F8FAFC',
        'sf-surface':     '#FFFFFF',
        'sf-elevated':    '#F1F5F9',
        'sf-border':      '#E2E8F0',
        'sf-text':        '#0F172A',
        'sf-muted':       '#64748B',
        'sf-critical':    '#DC2626',
        'sf-high':        '#EA580C',
        'sf-medium':      '#D97706',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'sf-card': '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        'sf-elevated': '0 4px 6px -1px rgba(15,23,42,0.07), 0 2px 4px -2px rgba(15,23,42,0.05)',
        'sf-fab': '0 8px 24px rgba(26,86,219,0.35), 0 2px 6px rgba(26,86,219,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
