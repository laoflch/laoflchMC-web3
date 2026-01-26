import { createApp } from 'vue'
import ElementPlus, { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'

const app = createApp(App)

app.use(ElementPlus)
app.use(router)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')

// 监听未授权事件，统一跳转到登录并通知用户
if (typeof window !== 'undefined') {
  window.addEventListener('auth-unauthorized', () => {
    try {
      ElMessage.warning('身份已过期，请重新登录')
    } catch (e) {}
    try {
      router.push('/login')
    } catch (e) {}
  })
}
