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
      // Forward /projects to Express so the EJS gallery is served (required by run.py)
      "/projects": "http://localhost:8080",
      // Forward all API calls to Express backend
      "/api": "http://localhost:8080",
      "/auth": "http://localhost:8080",
    },
  },
})
