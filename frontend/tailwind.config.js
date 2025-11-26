/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: '#00ff80',
        'dark-bg': '#050505',
        glass: 'rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
}
