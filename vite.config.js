/*import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})*/

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Esto le dice a Vite: "Confía en las peticiones que vengan de estos dominios"
    allowedHosts: [
      'sgei.local',
      'api.sgei.local'
    ],
    // Forzamos a que escuche en la IP local para que el Proxy de Apache lo encuentre
    host: '127.0.0.1',
    port: 5173,
    // Opcional: Esto ayuda si tienes problemas con WebSockets de HMR
    hmr: {
      host: 'sgei.local',
      protocol: 'ws' // Fuerza el protocolo WebSocket estándar
   }
  }
})