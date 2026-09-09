/*import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})*/

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteReactMcp from "vite-react-mcp";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteReactMcp()],
  server: {
    // Esto le dice a Vite: "Confía en las peticiones que vengan de estos dominios"
    allowedHosts: ["sgei.local", "api.sgei.local"],
    // Forzamos a que escuche en la IP local para que el Proxy de Apache lo encuentre
    host: "127.0.0.1",
    port: 5173,
    // Opcional: Esto ayuda si tienes problemas con WebSockets de HMR
    hmr: {
      host: "sgei.local",
      protocol: "wss", // Fuerza el protocolo WebSocket SSL
      clientPort: 443,
    },
  },
  // --- CONFIGURACIÓN DE CODE SPLITTING / BUILD ---
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa las librerías de node_modules en un chunk 'vendor'
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    css: true,
  },
});
