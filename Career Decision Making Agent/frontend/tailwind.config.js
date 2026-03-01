/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05060f'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,0.35), 0 12px 40px rgba(0,0,0,0.45)'
      }
    }
  },
  plugins: []
}
