import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff9e6',
          500: '#e6b800',
          600: '#b38f00',
        },
      },
    },
  },
  plugins: [],
};

export default config;
