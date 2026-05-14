import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FBFAF7',
          2: '#F4F2EC',
          3: '#EBE7DD',
        },
        ink: {
          DEFAULT: '#1A1814',
          2: '#3F3A33',
          3: '#6C665C',
          4: '#9A9388',
        },
        rule: {
          DEFAULT: 'rgba(26,24,20,0.10)',
          strong: 'rgba(26,24,20,0.18)',
        },
        accent: {
          DEFAULT: '#00B864',
          2: '#00955C',
        },
        highlight: {
          DEFAULT: '#FFE89A',
          strong: '#FFD24A',
        },
        flame: '#D9521F',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', '"Source Serif Pro"', '"Charter"', 'Cambria', 'Georgia', 'serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      maxWidth: {
        page: '1280px',
        narrow: '980px',
      },
    },
  },
  plugins: [],
};

export default config;
