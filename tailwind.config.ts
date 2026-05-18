import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0A0B",
          elevated: "#111113",
          subtle: "#0E0E10",
          hover: "#17171A",
        },
        border: {
          DEFAULT: "#1E1E22",
          strong: "#2A2A30",
        },
        fg: {
          DEFAULT: "#EDEDEF",
          muted: "#7A7A80",
          subtle: "#52525A",
        },
        accent: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
          subtle: "rgba(59,130,246,0.12)",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
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
        ring: "0 0 0 1px rgba(255,255,255,0.05)",
        focus: "0 0 0 2px rgba(59,130,246,0.35)",
        panel: "0 20px 60px -20px rgba(0,0,0,0.8)",
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
