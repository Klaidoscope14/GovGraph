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
        ink: "#17212b",
        mist: "#f5f7f9",
        line: "#d8dee5",
        risk: {
          low: "#2f9e6d",
          medium: "#d59d23",
          high: "#d85b41",
          critical: "#b73144"
        }
      },
      boxShadow: {
        panel: "0 10px 28px rgba(23, 33, 43, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
