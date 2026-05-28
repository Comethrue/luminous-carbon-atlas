/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#060B14',
        surface: '#0D1628',
        'surface-alt': '#09101F',
        border: '#1A2A44',
        cyan: '#00D4FF',
        'cyan-dim': 'rgba(0,212,255,0.15)',
        green: '#34C759',
        red: '#FF3B30',
        gold: '#FFD700',
        'text-primary': '#E8EDF5',
        'text-secondary': '#8899BB',
        'text-muted': '#4A6080',
      },
      fontFamily: {
        display: ['"DIN Alternate"', '"Bahnschrift"', '"Impact"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Consolas"', 'monospace'],
        body: ['"PingFang SC"', '"Microsoft YaHei"', '"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
