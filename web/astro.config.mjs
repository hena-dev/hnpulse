import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://hnpulse.hena.dev",
  prefetch: {
    defaultStrategy: "hover",
  },
  redirects: {
    "/": "/1m",
  },
  integrations: [react()],
  server: {
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    // Allow Tailscale MagicDNS hosts in dev (HMR host-check).
    server: {
      allowedHosts: [".ts.net", "localhost"],
    },
  },
  build: {
    inlineStylesheets: "auto",
  },
});
