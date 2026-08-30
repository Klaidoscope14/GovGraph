import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#f0ece4",
        mist: "#0c0e12",
        line: "#2a3040",
        surface: "#141820",
        elevated: "#1c2230",
        accent: "#e8772e",
        "accent-glow": "#f59e4c",
        "accent-subtle": "#2d1f10",
        "text-secondary": "#8a93a0",
        risk: {
          low: "#3abf7a",
          medium: "#e8b83a",
          high: "#e8772e",
          critical: "#e84057"
        }
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-ibm-plex-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        metric: ["var(--font-outfit)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        panel: "0 10px 28px rgba(0, 0, 0, 0.3)",
        glow: "0 0 20px rgba(232, 119, 46, 0.15)",
        card: "0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 12px 32px -12px rgba(0, 0, 0, 0.5)",
        ring: "0 0 0 4px rgba(232, 119, 46, 0.15)"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(232, 119, 46, 0.2)" },
          "50%": { boxShadow: "0 0 20px rgba(232, 119, 46, 0.4)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.18s ease-out both",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
