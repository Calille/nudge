import type { Config } from "tailwindcss";

// Token values come from CSS variables defined in src/styles/globals.css
// for both light (:root) and dark (.dark) palettes. Using the
// `rgb(var(--x) / <alpha-value>)` form preserves Tailwind's /alpha
// modifier syntax, so e.g. `bg-accent/15` still works.
const rgb = (variable: string) => `rgb(var(--${variable}) / <alpha-value>)`;

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: rgb("bg"),
          elevated: rgb("bg-elevated"),
          subtle: rgb("bg-subtle"),
          hover: rgb("bg-hover"),
        },
        border: {
          DEFAULT: rgb("border"),
          strong: rgb("border-strong"),
        },
        fg: {
          DEFAULT: rgb("fg"),
          muted: rgb("fg-muted"),
          subtle: rgb("fg-subtle"),
        },
        accent: {
          DEFAULT: rgb("accent"),
          hover: rgb("accent-hover"),
          subtle: "rgb(var(--accent) / 0.12)",
        },
        success: rgb("success"),
        warning: rgb("warning"),
        danger: rgb("danger"),
      },
      fontFamily: {
        sans: [
          "SF Pro Display",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        ring: "var(--shadow-ring)",
        focus: "0 0 0 2px rgb(var(--accent) / 0.35)",
        panel: "var(--shadow-panel)",
      },
      animation: {
        "fade-in": "fadeIn 180ms ease-out",
        "slide-up": "slideUp 220ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
