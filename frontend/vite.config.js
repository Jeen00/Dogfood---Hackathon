import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to Express backend
      "/projects/api": "http://localhost:8080",
      "/api": "http://localhost:8080",
      "/auth": "http://localhost:8080",
      "/team": "http://localhost:8080",
      "/submissions": "http://localhost:8080",
      "/organizer": "http://localhost:8080",
      "/events": "http://localhost:8080",
      "/invite": "http://localhost:8080",
      "/judge/score": "http://localhost:8080",
      "/judge/scores": "http://localhost:8080",
    },
  },
})
