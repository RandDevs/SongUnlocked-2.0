import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png"],
      devOptions: {
        enabled: false,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "CacheFirst",
          },
          {
            urlPattern: ({ request }) =>
              ["style", "script", "image", "font"].includes(
                request.destination,
              ),
            handler: "CacheFirst",
          },
        ],
      },
      manifest: {
        name: "SongUnlocked",
        short_name: "SongUnlocked",
        description:
          "An offline songbook for tracking the songs you can actually play.",
        start_url: "./index.html#/home",
        scope: "./",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#08090a",
        theme_color: "#08090a",
        categories: ["music", "education", "productivity"],
        icons: [
          {
            src: "./assets/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "./assets/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "./assets/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "./assets/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
