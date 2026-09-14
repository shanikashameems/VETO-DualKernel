/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#F8F7F4',
          100: '#F4F1EA',
        },
        dark: {
          900: '#0F1117',
          950: '#141720',
        },
        blueprint: '#2563EB',
      },
    },
  },
  plugins: [],
}
