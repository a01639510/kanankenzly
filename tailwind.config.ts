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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Marca Kenzly: remapeamos `orange` al naranja de producto (#F8921D)
        // para recolorear toda la app sin tocar cada clase.
        orange: {
          50: "#FEF5E9",
          100: "#FCE7C7",
          200: "#F9CE8C",
          300: "#F7B658",
          400: "#F8A235",
          500: "#F8921D", // naranja Kenzly (acento de marca)
          600: "#E07B0B",
          700: "#B86109",
          800: "#8F4C0E",
          900: "#743F11",
        },
        // Superficies del tema oscuro (inspo kananmx.netlify.app).
        canvas: "#0a0a0a", // fondo de página
        surface: "#121212", // tarjetas / paneles
        surface2: "#1c1c1c", // anidado: inputs, filas, chips
        cream: "#E1E0CC", // beige/hueso: texto primario y fondo de botón pill
        // Gris azulado neutro para kickers/metadata/labels (NO usar gris frío
        // genérico ahí: el texto secundario de cuerpo usa cream con opacidad).
        meta: "#7C8393",
      },
      fontFamily: {
        sans: ["var(--font-almarai)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
