import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { brand: "#0a0aff" }, boxShadow: { soft: "0 16px 55px rgba(20,32,70,.09)" } } }, plugins: [] };
export default config;
