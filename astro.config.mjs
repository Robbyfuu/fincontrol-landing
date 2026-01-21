import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  adapter: cloudflare(),
  integrations: [react(), tailwind()],
  output: "static",
  vite: {
    server: {
      allowedHosts: ["landing-dev.fincontrol.cl"],
      host: "127.0.0.1",
    },
  },
});
