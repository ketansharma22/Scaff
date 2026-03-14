/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-cabinet)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        obsidian: { 50:"#f8f8f8", 100:"#efefef", 200:"#dcdcdc", 300:"#bdbdbd", 400:"#989898", 500:"#7c7c7c", 600:"#656565", 700:"#525252", 800:"#464646", 900:"#3d3d3d", 950:"#000000" },
      },
      animation: {
        "fade-up":   "fadeUp 0.5s ease forwards",
        "fade-in":   "fadeIn 0.4s ease forwards",
        "scale-in":  "scaleIn 0.3s ease forwards",
        "pulse-glow":"pulseGlow 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeUp:    { from:{ opacity:"0", transform:"translateY(16px)" }, to:{ opacity:"1", transform:"translateY(0)" } },
        fadeIn:    { from:{ opacity:"0" }, to:{ opacity:"1" } },
        scaleIn:   { from:{ opacity:"0", transform:"scale(0.95)" }, to:{ opacity:"1", transform:"scale(1)" } },
        pulseGlow: { "0%,100%":{ opacity:"0.6" }, "50%":{ opacity:"1" } },
      },
    },
  },
  plugins: [],
};
