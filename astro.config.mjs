// @ts-check
import { defineConfig } from 'astro/config';

import vercel from "@astrojs/vercel";

import vue from "@astrojs/vue";

// https://astro.build/config
export default defineConfig({
  output: "server",

  adapter: vercel({
    webAnalytics: { enabled: true },
  }),

  integrations: [vue()],
});