import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Bratsho DS 1.0 — نفس القيم في تطبيق Flutter (design_spec/tokens.json).
      // Inter للحروف اللاتينية والأرقام، و Tajawal للعربية (fallback تلقائي لكل حرف).
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-tajawal)", "system-ui", "sans-serif"],
      },
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
          900: "#182d68",
          // كانت مستخدمة في الكود (dark:brand-950) دون تعريف فلم تُولَّد.
          950: "#0f1c45",
        },
        action: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          // كانت مستخدمة (action-800/900/950) دون تعريف فلم تُولَّد.
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        ink: "#071226",
        // تدرّج الترويسة الكحلية (كان قيماً حرفية في site-header).
        header: { from: "#0c1a3a", to: "#0a1330" },
        // أدوار دلالية تتبدّل مع html.dark عبر متغيرات CSS في globals.css.
        canvas: "rgb(var(--bc-canvas) / <alpha-value>)",
        surface: "rgb(var(--bc-surface) / <alpha-value>)",
        fill: "rgb(var(--bc-fill) / <alpha-value>)",
        line: "rgb(var(--bc-line) / <alpha-value>)",
        heading: "rgb(var(--bc-heading) / <alpha-value>)",
        secondary: "rgb(var(--bc-secondary) / <alpha-value>)",
        muted: "rgb(var(--bc-muted) / <alpha-value>)",
        price: "rgb(var(--bc-price) / <alpha-value>)",
      },
      boxShadow: {
        card: "0 12px 40px rgba(5, 18, 38, 0.08)",
        blue: "0 10px 30px rgba(49, 95, 232, 0.18)",
        // الاسم الموحّد في المواصفة؛ blue يبقى للتوافق.
        primary: "0 10px 30px rgba(49, 95, 232, 0.18)",
        action: "0 10px 30px rgba(249, 115, 22, 0.25)",
        raised: "0 -6px 24px rgba(5, 18, 38, 0.06)",
        nav: "0 8px 40px rgba(7, 18, 38, 0.12)",
      },
      borderRadius: { xl2: "1.5rem" },
      animation: {
        "fade-in": "fadeIn 0.25s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
