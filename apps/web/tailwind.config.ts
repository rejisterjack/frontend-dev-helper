import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        bg: {
          base: "var(--bg-base)",
          elevated: "var(--bg-elevated)",
          subtle: "var(--bg-subtle)",
        },
        line: {
          subtle: "var(--line-subtle)",
          DEFAULT: "var(--line-default)",
          strong: "var(--line-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
        },
        brand: {
          cyan: "var(--brand-cyan)",
          "cyan-strong": "var(--brand-cyan-strong)",
          violet: "var(--brand-violet)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      fontSize: {
        // Strict 8-step ramp. Body-adjacent floor is 12px (xs).
        xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        "3xl": [
          "1.875rem",
          { lineHeight: "2.25rem", letterSpacing: "-0.02em" },
        ],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em" }],
        "5xl": ["3rem", { lineHeight: "3.25rem", letterSpacing: "-0.03em" }],
        "6xl": ["3.75rem", { lineHeight: "4rem", letterSpacing: "-0.035em" }],
      },
      borderRadius: {
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.3)",
        card: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.5)",
        elevated:
          "0 1px 2px rgba(0,0,0,0.3), 0 24px 48px -16px rgba(0,0,0,0.7)",
        "glow-cyan":
          "0 0 0 1px rgba(34,211,238,0.12), 0 8px 32px -8px rgba(34,211,238,0.3)",
        "glow-violet":
          "0 0 0 1px rgba(167,139,250,0.12), 0 8px 32px -8px rgba(167,139,250,0.3)",
      },
      transitionTimingFunction: {
        outQuart: "var(--ease-out-quart)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      maxWidth: {
        container: "72rem",
      },
      gridAutoRows: {
        "18rem": "18rem",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "spin-slow": "spin 14s linear infinite",
        glow: "glow 3s ease-in-out infinite alternate",
        scan: "scan 4s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        glow: {
          "0%": { boxShadow: "0 0 24px -8px rgba(34,211,238,0.4)" },
          "100%": { boxShadow: "0 0 32px -4px rgba(34,211,238,0.6)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
