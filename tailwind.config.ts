import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"], display: ["var(--font-display)", "var(--font-inter)", "sans-serif"] },
      colors: {
        ink: "#102A35", muted: "#566B6F", line: "#E5ECEA", canvas: "#F7F5F0",
        brand: { 50: "#EDF5F3", 100: "#D6E9E5", 500: "#2A8C83", 600: "#1F7A72", 700: "#18635C", 900: "#102A35" },
        accent: { 50: "#FDF0EC", 100: "#FADBD2", 500: "#E4573D", 600: "#C3402A" }, saff: { 100: "#FCEBD0", 500: "#F2A93B" },
        flag: { 50: "#fdf0ee", 500: "#b83a2e" }
      },
      boxShadow: { soft: "0 1px 2px rgba(16,24,22,.04), 0 4px 16px rgba(16,24,22,.04)" }
    }
  },
  plugins: []
};
export default config;
