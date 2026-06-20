/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        anthrazit: '#211C18',
        petrol: {
          DEFAULT: '#134E48',
          hell: '#1F6E64',
        },
        glut: {
          DEFAULT: '#C75B2A',
          hell: '#E0794A',
        },
        salbei: '#7E9A6B',
        leinen: '#E7DFD2',
        sand: '#F6F1E9',
        weiss: '#FFFFFF',
        text: {
          DEFAULT: '#2A241F',
          leise: '#6B6253',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        grotesk: ['"Hanken Grotesk"', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
