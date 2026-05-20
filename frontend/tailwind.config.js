/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      colors: {
        cyber: {
          bg: "#05080f",
          panel: "#0b1220",
          panel2: "#0e1728",
          cyan: "#22d3ee",
          green: "#39ff88",
          amber: "#facc15",
          red: "#fb7185",
          line: "rgba(34, 211, 238, 0.18)",
        },
      },
      boxShadow: {
        glow: "0 0 28px rgba(34, 211, 238, 0.18)",
        greenGlow: "0 0 24px rgba(57, 255, 136, 0.14)",
      },
    },
  },
  plugins: [],
};
