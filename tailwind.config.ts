import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Supreme One brand colors
        primary: {
          blue: '#1e40af', // Supreme One primary blue
          red: '#dc2626',  // Supreme One secondary red
        },
        dark: {
          gray: '#1f2937',
        },
        light: {
          gray: '#f3f4f6',
        },
        success: {
          green: '#10b981',
        },
        warning: {
          yellow: '#f59e0b',
        },
        text: {
          dark: '#111827',
          light: '#6b7280',
        },
      },
      backgroundImage: {
        'gradient-supreme': 'linear-gradient(135deg, #1e40af, #dc2626)',
        'gradient-light': 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
