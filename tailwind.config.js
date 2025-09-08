/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS 변수 기반 색상 시스템
        background: 'rgb(var(--color-background))',
        foreground: 'rgb(var(--color-foreground))',
        muted: 'rgb(var(--color-muted))',
        'muted-foreground': 'rgb(var(--color-muted-foreground))',
        border: 'rgb(var(--color-border))',
        input: 'rgb(var(--color-input))',
        ring: 'rgb(var(--color-ring))',
        
        // 카드와 표면
        card: 'rgb(var(--color-card))',
        'card-foreground': 'rgb(var(--color-card-foreground))',
        popover: 'rgb(var(--color-popover))',
        'popover-foreground': 'rgb(var(--color-popover-foreground))',
        
        // Primary 브랜드 색상 (다크모드에서도 유지)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: 'rgb(var(--color-primary))',
          600: 'rgb(var(--color-primary-600))',
          700: 'rgb(var(--color-primary-700))',
          DEFAULT: 'rgb(var(--color-primary))',
          foreground: 'rgb(var(--color-primary-foreground))',
        },
        
        // Secondary 색상
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary))',
          foreground: 'rgb(var(--color-secondary-foreground))',
        },
        
        // 상태 색상
        destructive: {
          DEFAULT: 'rgb(var(--color-destructive))',
          foreground: 'rgb(var(--color-destructive-foreground))',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning))',
          foreground: 'rgb(var(--color-warning-foreground))',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success))',
          foreground: 'rgb(var(--color-success-foreground))',
        },
        
        // 액센트 색상
        accent: {
          DEFAULT: 'rgb(var(--color-accent))',
          foreground: 'rgb(var(--color-accent-foreground))',
        },
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}