import { defineConfig } from 'vite'
import { viteMockServe } from 'vite-plugin-mock'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ command }) => {
  return {
    plugins: [
      vue(),
      viteMockServe({ 
        mockPath: 'src/mock',
        localEnabled: true, // 在所有环境中启用
        prodEnabled: true, // 在生产环境也启用
        injectCode: `
          import { setupProdMockServer } from './mock/index';
          setupProdMockServer();
        `,
        supportTs: false,
        watchFiles: true,
        logger: true,
        ignore: /^\_/,
        mockUrlPrefix: '/mock',
        ignoreFiles: ['_*.js']
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@assets': path.resolve(__dirname, 'src/common/assets')
      }
    },
    server: {
      port: 5173,
      open: true,
      cors: true,
      proxy: {
        '/mock': {
          target: 'http://localhost:5173',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mock/, '')
        }
      }
    },
    preview: {
      port: 4173,
      proxy: {
        '/mock': {
          target: 'http://localhost:4173',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mock/, '')
        },
        '/api': {
          target: 'http://localhost:4173/mock',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
}) 