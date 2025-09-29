import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "YouTube Live Chat Lightweight Ticker",
    web_accessible_resources: [
      {
        resources: ["injected.js"],
        matches: ["https://www.youtube.com/*"],
      },
    ],
  },
  imports: false,
  srcDir: "src",
});
