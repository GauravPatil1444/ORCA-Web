import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.lottie'], 
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Adjust '/api' to match whatever prefix your frontend uses to call the backend
      '/api': { 
        target: 'http://localhost:8000',
        changeOrigin: true,
        
        // CRITICAL FIX: Prevent Vite's proxy from buffering Server-Sent Events (SSE)
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // If the request is our streaming chat endpoint, force no-cache headers
            if (req.url?.includes('/chat/stream')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
              // Ensure the connection stays open for streaming
              proxyRes.headers['connection'] = 'keep-alive'; 
            }
          });
        }
      }
    }
  }
})