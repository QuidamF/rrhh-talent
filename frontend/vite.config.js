import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hmrPort = env.VITE_HMR_CLIENT_PORT || process.env.VITE_HMR_CLIENT_PORT

  // Si se define VITE_HMR_CLIENT_PORT (ej: 443 en VPS con reverse proxy HTTPS):
  // Se fuerza 'wss' y clientPort para evitar Mixed Content y el fallback a localhost:5173
  const hmrConfig = hmrPort ? {
    protocol: (hmrPort === '443' || String(hmrPort).includes('443')) ? 'wss' : 'ws',
    clientPort: parseInt(hmrPort, 10)
  } : undefined;

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true, // Permite cualquier dominio/host asignado como rh.grupojpm.mx
      hmr: hmrConfig,
      watch: {
        usePolling: true // Habilita la detección de cambios dentro de volúmenes Docker en Windows
      }
    }
  }
})
