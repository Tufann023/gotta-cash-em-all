import type { Config } from "tailwindcss";

// Pokemon TCG palette — handoff "Gotta Cash 'Em All"
// Selected accent = Pokéball Red (#EE1515), theme = light
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pokemon brand
        pokeYellow: "#FFCB05",
        pokeYellowDeep: "#F2B705",
        pokeBlue: "#2A75BB",
        pokeBlueDeep: "#1B528C",
        pokeRed: "#EE1515",
        pokeRedDeep: "#B30E0E",
        pokeGreen: "#3FA34D",
        pokePurple: "#7C5CD6",
        pokeNavy: "#0B2A4A",

        // Surfaces
        bg: "#F4F8FE",
        bg2: "#E9F1FB",
        card: "#FFFFFF",
        ink: "#0B2A4A",
        ink2: "#3A5675",
        ink3: "#6E86A3",
        line: "#DCE7F4",
        lineStrong: "#C3D5EC",

        // Semantic accent = Pokéball Red
        accent: "#EE1515",
        accentDeep: "#B30E0E",
        accentSoft: "#FDE7E7",

        pos: "#1f7a32",
        posBg: "#e3f6e7",
        neg: "#b3261e",
        negBg: "#fdebe9",
      },
      fontFamily: {
        display: ["\"Luckiest Guy\"", "system-ui", "sans-serif"],
        sans: ["\"Outfit\"", "system-ui", "sans-serif"],
      },
      maxWidth: { page: "1140px", prose: "640px" },
      borderRadius: {
        "sm": "10px",
        "md": "16px",
        "lg": "24px",
        "full": "999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(11,42,74,.06), 0 2px 8px rgba(11,42,74,.05)",
        md: "0 8px 24px rgba(11,42,74,.10), 0 2px 6px rgba(11,42,74,.06)",
        lg: "0 24px 60px rgba(11,42,74,.18), 0 8px 20px rgba(11,42,74,.10)",
      },
      transitionTimingFunction: {
        poke: "cubic-bezier(0.22,1,0.36,1)",
      },
      keyframes: {
        holo: { to: { backgroundPosition: "300% 0" } },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
        pokeSpin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        holo: "holo 6s linear infinite",
        "holo-fast": "holo 5s linear infinite",
        "fade-up": "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "poke-spin": "pokeSpin 1s linear infinite",
      },
      backdropBlur: { nav: "12px" },
    },
  },
  plugins: [],
};

export default config;
