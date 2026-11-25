import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rarity: {
          common: { bg: "#F1EFE8", text: "#444441", border: "#D3D1C7" },
          uncommon: { bg: "#EAF3DE", text: "#3B6D11", border: "#C0DD97" },
          rare: { bg: "#E6F1FB", text: "#185FA5", border: "#B5D4F4" },
          epic: { bg: "#EEEDFE", text: "#3C3489", border: "#CECBF6" },
          legendary: { bg: "#FAEEDA", text: "#854F0B", border: "#FAC775" },
        },
        stat: {
          grind: "#2563eb",
          focus: "#16a34a",
          ship: "#dc2626",
          squash: "#7c3aed",
          vibe: "#d97706",
        },
      },
      animation: {
        "legendary-shimmer": "legendaryShimmer 4s linear infinite",
        sparkle: "sparkle 1.5s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "egg-wobble": "eggWobble 2s ease-in-out infinite",
        "level-up": "levelUp 0.6s ease-out forwards",
      },
      keyframes: {
        legendaryShimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        sparkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.2)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        eggWobble: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        levelUp: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "60%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
