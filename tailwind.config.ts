import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          200: "#bdd0ff",
          300: "#8eaefd",
          400: "#5c84f6",
          500: "#315fe8",
          600: "#2048c5",
          700: "#1c389c",
          800: "#1a317d",
          900: "#182d68"
        },
        ink: "#071226"
      },
      boxShadow: {
        card: "0 12px 40px rgba(5, 18, 38, 0.08)",
        blue: "0 10px 30px rgba(49, 95, 232, 0.18)",
        soft: "0 20px 60px rgba(5, 18, 38, 0.12)"
      },
      borderRadius: {
        xl2: "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;
