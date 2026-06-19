/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        petrol: '#134E48',
        anthrazit: '#211C18',
        glut: '#C75B2A',
      },
    },
  },
  plugins: [],
};
