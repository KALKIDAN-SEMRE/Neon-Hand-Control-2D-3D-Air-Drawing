import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      // Required for MediaPipe WASM and SharedArrayBuffer
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      // Content Security Policy: Secure but allows MediaPipe requirements
      // MediaPipe requires 'unsafe-eval' for WASM compilation
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline';",
    },
  },
  // MediaPipe is loaded via CDN script tag, not bundled
  optimizeDeps: {
    exclude: ['@mediapipe/hands'],
  },
  build: {
    rollupOptions: {
      // Externalize MediaPipe (loaded via CDN)
      external: ['@mediapipe/hands'],
    },
  },
});
