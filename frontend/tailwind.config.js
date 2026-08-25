/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bgLight: '#F7F5F0',
        bgCard: '#FFFFFF',
        charcoal: '#1E1E24',
        accentCoral: '#FF85A1',
        accentPeach: '#FFB074',
        accentMint: '#3D8A7E',
        accentSage: '#4E9F8E',
        accentLilac: '#8F94FB',
        accentYellow: '#FFD166',
        adminBlue: '#4A90E2',
      },
      borderRadius: {
        'bento': '28px',
        'bento-lg': '32px',
        'bento-sm': '20px',
      },
      boxShadow: {
        'bento': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'bento-hover': '0 14px 40px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
