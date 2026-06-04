import type { Config } from "tailwindcss";

// Pokemon-themed palette met behoud van Apple-stijl rust en leesbaarheid.
// Kernkleuren komen direct van het Pokemon-logo (geel + blauw).
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutrals (Apple-stijl rust)
        canvas: "#fbfbfd",
        surface: "#ffffff",
        elevated: "#f5f5f7",
        ink: "#1d1d1f",
        muted: "#6e6e73",
        subtle: "#86868b",
        line: "#d2d2d7",

        // Pokemon brand colors
        pokeYellow: "#FFCB05",       // Pikachu / logo yellow
        pokeYellowDark: "#E0B000",
        pokeYellowSoft: "#FFF4CC",
        pokeBlue: "#3D7DCA",         // Logo blue (primary accent)
        pokeBlueDark: "#2A5A98",
        pokeBlueSoft: "#E1ECFA",
        pokeRed: "#EE1515",          // Pokeball red
        pokeRedDark: "#CC0000",
        pokeRedSoft: "#FCE4E4",

        // Aliases die naar Pokemon kleuren wijzen
        accent: "#3D7DCA",
        accentHover: "#2A5A98",
        accentSoft: "#E1ECFA",
        pos: "#34c759",
        neg: "#EE1515",
        warn: "#FFCB05",
      },
      fontFamily: {
        // Display (headings): Fredoka — vriendelijk, rond, Pokemon-vibe
        display: [
          "Fredoka",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        // Body (rest): houden we Apple-systeem voor leesbaarheid
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
      },
      maxWidth: { page: "1120px" },
      borderRadius: { "2xl": "16px", "3xl": "24px" },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        hover: "0 10px 30px rgba(61,125,202,0.10), 0 2px 6px rgba(0,0,0,0.04)",
        pokeYellow: "0 4px 0 #E0B000",   // 'card-game' button shadow
        pokeBlue: "0 4px 0 #2A5A98",
        nav: "0 1px 0 rgba(0,0,0,0.06)",
      },
      backdropBlur: { nav: "20px" },
      letterSpacing: {
        tight: "-0.022em",
        display: "-0.026em",
        wide: "0.01em",
      },
      keyframes: {
        spinPoke: {
          "to": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "spin-poke": "spinPoke 1s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
