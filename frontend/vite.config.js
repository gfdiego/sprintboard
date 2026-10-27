import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // En desarrollo /api se reenvía al backend: el navegador ve un solo origen
    // y la cookie del refresh token funciona sin configurar nada más.
    // VITE_PROXY_API permite apuntar a otro backend (por ejemplo, uno de pruebas)
    proxy: { '/api': process.env.VITE_PROXY_API || 'http://localhost:3000' },
  },
});
