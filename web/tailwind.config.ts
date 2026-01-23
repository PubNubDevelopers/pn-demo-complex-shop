import type { Config } from "tailwindcss";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { heroui } = require("@heroui/react");

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        // Complex Brand Colors
        complex: {
          red: "#FF0000",
          black: "#000000",
          white: "#FFFFFF",
          gray: {
            dark: "#333333",
            DEFAULT: "#666666",
            light: "#F2F2F2"
          }
        },
        // Original colors maintained for compatibility
        navy900: "#184A2C",
        navy800: "#22663D",
        navy700: "#2E8B57",
        navy600: "#3A9D5D",
        navy500: "#5CB97A",
        navy400: "#8CD9A7",
        navy300: "#B8EBD0",
        navy200: "#D6F5E3",
        navy100: "#E6F4EA",
        navy50: "#F6FBF8",
        teal900: "#004756",
        teal800: "#065B6A",
        teal700: "#216F7B",
        teal600: "#3C828C",
        teal500: "#57969C",
        teal400: "#72A9AD",
        teal300: "#92BDC0",
        teal200: "#B2D0D2",
        teal100: "#D1E4E5",
        teal50: "#F1F7F7",
        neutral900: "#171717",
        neutral800: "#262626",
        neutral700: "#404040",
        neutral600: "#525252",
        neutral500: "#737373",
        neutral400: "#A3A3A3",
        neutral300: "#D4D4D4",
        neutral200: "#E5E5E5",
        neutral100: "#F5F5F5",
        neutral50: "#FAFAFA",
        brandAccent1: "#22663D",
        brandAccent2: "#2E8B57",
        brandAccent3: "#4FC3A1",
        brandAccent4: "#B8EBD0",
        brandAccent5: "#E6F4EA",
        cherry: "#CD2026",

        success800: "#166534",
        success700: "#15803D",
        success500: "#22C55E",
        success100: "#DCFCE7",
        success50: "#F0FDF4",

        error800: "#9A1A1E",
        error700: "#BA1B21",
        error500: "#F04349",
        error100: "#FEE2E3",
        error50: "#FEF2F2",

        info800: "#1E40AF",
        info700: "#1D4ED8",
        info500: "#3B82F6",
        info100: "#DBEAFE",
        info50: "#EFF6FF",

        warning800: "#92400E",
        warning700: "#B45309",
        warning500: "#F59E0B",
        warning100: "#FEF3C7",
        warning50: "#FFFBEB",

        appYellow1: "#FFCF40",
        appYellow2: "#B59410",

      },
      screens: {
        '3xl': '120rem',
        '4xl': '140rem',
        '5xl': '160rem',
        'iframe': '847px',
      }
    },
  },
  darkMode: "selector",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            secondary: "#589CFF",
          },
        },
        dark: {
          colors: {
            secondary: "#589CFF",
            danger: "#DD8D90",
          },
        },
      },
    }),
  ],
} satisfies Config;
