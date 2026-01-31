import { createApp } from 'vue'
import ElementPlus, { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'

const app = createApp(App)

// 自定义Element Plus断点配置
const breakpoints = {
  xs: 0,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1920,
  xxl: 2560,
  xxxl: 3820
}

app.use(ElementPlus, { breakpoints })
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
