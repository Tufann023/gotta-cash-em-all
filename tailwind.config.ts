import type { Config } from "tailwindcss";

// Apple-geïnspireerd palette (gebaseerd op apple.com / Human Interface Guidelines)
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple-systeemkleuren
        canvas: "#fbfbfd",         // hoofd-achtergrond, Apple's signature off-white
        surface: "#ffffff",        // cards / panels
        elevated: "#f5f5f7",       // licht-verhoogd, secondary surface
        ink: "#1d1d1f",            // primary text (Apple near-black)
        muted: "#6e6e73",          // secondary text (Apple gray)
        subtle: "#86868b",         // tertiary text
        line: "#d2d2d7",           // hairline borders
        accent: "#0071e3",         // Apple blue (CTA, links)
        accentHover: "#0077ed",
        accentSoft: "#e5f1fc",
        pos: "#34c759",            // Apple system green
        neg: "#ff3b30",            // Apple system red
        warn: "#ff9500",           // Apple system orange
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
      },
      maxWidth: {
        page: "1120px",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        hover: "0 10px 30px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)",
        nav: "0 1px 0 rgba(0,0,0,0.06)",
      },
      backdropBlur: {
        nav: "20px",
      },
      letterSpacing: {
        tight: "-0.022em",
        display: "-0.026em",
      },
    },
  },
  plugins: [],
};

export default config;
