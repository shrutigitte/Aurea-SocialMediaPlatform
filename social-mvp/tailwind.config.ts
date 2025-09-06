
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class', // important for dark/light mode toggles
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#a855f7',   // lavender primary for light mode
          dark: '#9333ea',      // darker lavender for the dark mode
        },
      },
    },
  },
  plugins: [],
}
export default config
