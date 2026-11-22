import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"], display: ["var(--font-display)", "var(--font-inter)", "sans-serif"] },
      colors: {
        ink: "#18211f", muted: "#66716d", line: "#e6e9e8", canvas: "#f8f9f9",
        brand: { 50: "#eef6f4", 100: "#d9ebe6", 500: "#2a7a6c", 600: "#1f6458", 700: "#184f46", 900: "#0f332d" },
        accent: { 50: "#fdf4ec", 100: "#fbe6d2", 500: "#d06a1f", 600: "#b5581a" },
        flag: { 50: "#fdf0ee", 500: "#b83a2e" }
      },
      boxShadow: { soft: "0 1px 2px rgba(16,24,22,.04), 0 4px 16px rgba(16,24,22,.04)" }
    }
  },
  plugins: []
};
export default config;
