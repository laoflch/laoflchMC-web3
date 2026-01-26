import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const apiBase = env.VITE_API_BASE || ''
  console.log('VITE_API_BASE detected, setting up proxy for:', apiBase)
  /*const proxy = {}
  if (apiBase) {
    try {
      const url = new URL(apiBase)
      
      const basePath = url.pathname.replace(/\/$/, '') || '/api'
      //const target = `${url.protocol}//${url.host}`
      console.log('VITE_API_BASE detected, setting up proxy for:', basePath)
      const target = 'http://127.0.0.1:18081'
      proxy[basePath] = {
        target,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(new RegExp(`^${basePath}`), url.pathname || '/')
      }
    } catch (e) {
      proxy['/api'] = {
        target: apiBase,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }*/

  const proxy = {}
  
    try {
      //const url = new URL(apiBase)
      
      //const basePath = url.pathname.replace(/\/$/, '') || '/api'
      //const target = `${url.protocol}//${url.host}`
     // console.log('VITE_API_BASE detected, setting up proxy for:', basePath)
      const target = 'http://127.0.0.1:18081'
      proxy['/api'] = {
        target,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    } catch (e) {
      proxy['/api'] = {
        target: apiBase,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  

  return defineConfig({
    plugins: [vue()],
    server: {
      port: 3000,
      open: true,
      proxy/*: {
      '/api': {
        target: 'http://127.0.0.1:18081',   // 后端 API 地址
        changeOrigin: true,                // 改变请求源，避免 CORS 问题
        secure: false,                     // 如果是https接口，需要配置为false
        rewrite: (path) => path.replace(/^\/api/, ''),  // 重写路径，去掉/api前缀
      },
    },*/

    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  })
}
