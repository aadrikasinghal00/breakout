import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Serve getbreakout.ai from OUR origin so the backdrop iframe is same-origin. That buys
// three things a cross-origin iframe cannot give us at once: the real site scrolls
// natively (so its `100vh` sections and sticky headers stay undistorted), its own hover
// states keep working, and we can still read its scrollTop to drive the widget's
// on-scroll shrink. A cross-origin iframe forces you to pick two of the three.
//
// Every asset and link on the Framer-hosted site is an absolute URL, so nothing else
// needs rewriting. This is a dev/preview affordance for the prototype — a deployed build
// would need the same path proxied at the edge.
const siteProxy = {
  "/site": {
    target: "https://getbreakout.ai",
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/site/, "") || "/",
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind to all interfaces so both 127.0.0.1 (IPv4) and [::1] (IPv6) resolve — otherwise
    // Vite may listen on IPv6-only and browsers that map localhost→127.0.0.1 get "refused".
    host: true,
    proxy: siteProxy,
  },
  preview: { host: true, proxy: siteProxy },
});
