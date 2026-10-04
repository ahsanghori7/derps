import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { visualizer } from "rollup-plugin-visualizer"
import path from 'path'
import { fileURLToPath } from 'url'

const analyzeBundle = process.env.ANALYZE === 'true'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled'),
      '@components': path.resolve(__dirname, 'src/Components'),
      '@hooks': path.resolve(__dirname, 'src/Hooks'),
      '@api': path.resolve(__dirname, 'src/Api'),
      '@contexts': path.resolve(__dirname, 'src/Contexts'),
      '@stores': path.resolve(__dirname, 'src/Stores'),
      '@utils': path.resolve(__dirname, 'src/Utils'),
      '@features': path.resolve(__dirname, 'src/features'),
      'react-toastify$': path.resolve(__dirname, 'src/Utils/toastWrapper.js'),
      moment: path.resolve(__dirname, 'src/Utils/momentCompat.js'),
    },
  },
  plugins: [
    react(),
    svgr(),
    {
      name: 'well-known-json-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.includes('/.well-known/')) {
            res.setHeader('Content-Type', 'application/json');
          }
          if (req.url && /\.mjs(\?|$)/.test(req.url)) {
            res.setHeader('Content-Type', 'text/javascript');
          }
          next();
        });
      },
    },
    analyzeBundle && visualizer({
      open: true,
      filename: "dist/report.html",
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('@mui/icons-material')) return 'mui-icons'
          if (id.includes('@mui/x-')) return 'mui-x'
          if (id.includes('@mui/material') || id.includes('@mui/system')) return 'mui-core'
          if (id.includes('draft-js')) return 'draft-js'
          if (id.includes('exceljs')) return 'exceljs'
          if (id.includes('moment')) return 'moment'
          if (id.includes('mediasoup') || id.includes('@vpalmisano/virtual-background')) return 'webrtc'
          if (id.includes('socket.io')) return 'socket-io'
          if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor'
        },
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    proxy: {
      '/files': {
        target: 'https://dev-derps.gotmsolutions.com',
        changeOrigin: true,
        secure: false,
      },
      // Tenant logos on POS CDN (e.g. pos.gotmsolutions.com/files/uploads/...)
      '/proxy-pos': {
        target: 'https://pos.gotmsolutions.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy-pos/, ''),
      },
    },
  },
})
