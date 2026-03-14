/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        base:    '#0f0f0f',
        surface: '#161616',
        card:    '#1d1d1d',
        sidebar: '#0a0a0a',
        accent:  '#c9f135',
      },
      borderColor: {
        subtle: 'rgba(255,255,255,0.07)',
        strong: 'rgba(255,255,255,0.13)',
      },
    },
  },
  plugins: [],
}
