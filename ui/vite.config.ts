import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DivisionT82 holo interface. In desktop mode Tauri loads either the dev
// server (devUrl) or ui/dist (frontendDist); the same bundle also runs in a
// plain browser thanks to the mock IPC bridge.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
});
