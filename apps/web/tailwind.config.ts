import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        slatebg: "#f4f7fb",
        panel: "#ffffff",
        line: "#d9e2ec",
        accent: "#126782"
      }
    }
  },
  plugins: [],
} satisfies Config;
