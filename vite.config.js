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

  // const proxy = {}
  
  //   try {
  //     //const url = new URL(apiBase)
      
  //     //const basePath = url.pathname.replace(/\/$/, '') || '/api'
  //     //const target = `${url.protocol}//${url.host}`
  //    // console.log('VITE_API_BASE detected, setting up proxy for:', basePath)
  //     const target = 'http://127.0.0.1:18081'
  //     proxy['/api'] = {
  //       target,
  //       changeOrigin: true,
  //       secure: false,
  //       rewrite: (path) => path.replace(/^\/api/, '')
  //     }
  //   } catch (e) {
  //     proxy['/api'] = {
  //       target: apiBase,
  //       changeOrigin: true,
  //       secure: false,
  //       rewrite: (path) => path.replace(/^\/api/, '')
  //     }
  //   }
  

  return defineConfig({
    plugins: [vue()],
    server: {
      port: 3000,
      open: true,
      proxy: {
        // '/api': {
        //   target: 'http://127.0.0.1:18081',   // 后端 API 地址
        //   changeOrigin: true,                // 改变请求源，避免 CORS 问题
        //   secure: false,                     // 如果是https接口，需要配置为false
        //   rewrite: (path) => path.replace(/^\/api/, ''),  // 重写路径，去掉/api前缀
        // },
      
      //  '/socket.io': {
      //   target: 'ws://127.0.0.1:18081', // 后端地址
      //   changeOrigin: true, // 必须设置：修改请求头中的 host 为目标地址
      //   ws: true, // 关键：启用 WebSocket 代理
      //   // 注意：Socket.IO 的路径重写比较特殊，通常不需要重写路径，
      //   // 因为服务端默认也是监听 /socket.io
      //   rewrite: (path) => path.replace(/^\/socket.io/, '/socket.io/?EIO=4&transport=websocket'),  // 重写路径，去掉/socket.io前缀
      //   configure: (proxy, options) => {
      //     // 这里的 proxy 是 http-proxy 实例
      //     proxy.on('proxyReq', (proxyReq, req, res) => {
      //       console.log(`[Vite Proxy] 请求转发: ${req.method} ${req.url} -> ${options.target}${req.url}`);
      //     });
          
      //     proxy.on('error', (err, req, res) => {
      //       console.log('[Vite Proxy] 代理错误:', err);
      //     });
      //   }
      // },
      }
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  })
}
