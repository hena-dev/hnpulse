import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://hnpulse.hena.dev",
  integrations: [react()],
  server: {
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    // Allow Tailscale MagicDNS hosts in dev (HMR host-check).
    server: {
      allowedHosts: [".pug-mohs.ts.net", "chris-mini", "chris-mini.local", "localhost"],
    },
  },
  build: {
    inlineStylesheets: "auto",
  },
});
