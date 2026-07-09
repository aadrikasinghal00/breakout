import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Bind to all interfaces so both 127.0.0.1 (IPv4) and [::1] (IPv6) resolve — otherwise
  // Vite may listen on IPv6-only and browsers that map localhost→127.0.0.1 get "refused".
  server: { host: true },
});
