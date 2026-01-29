<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Profile from '@/views/Profile.vue'
import * as Icons from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import authApi from '@/services/authApi'
import { getUser, clearUser } from '@/services/auth'
import nav from '@/config/nav'

const router = useRouter()
const route = useRoute()
const userInfo = ref(null)
const profileVisible = ref(false)
const profileDialog = ref(false)

const openProfile = () => {
  profileDialog.value = true
  profileVisible.value = false
}

onMounted(() => {
  userInfo.value = getUser()
})

const activeIndex = computed(() => {
  // find nav item by route.name
  const found = nav.find((i) => i.name === route.name)
  return found ? found.name : (route.name === 'Profile' ? 'user' : 'Home')
})

const visibleNav = computed(() => {
  const role = (userInfo.value && userInfo.value.role) ? userInfo.value.role : 'guest'
  return nav.filter((item) => {
    // 从菜单中移除登录与个人资料项（右侧独立显示）
    if (item.name === 'Login' || item.name === 'Profile') return false
    if (!item.allowedRoles || item.allowedRoles.includes('*')) return true
    return item.allowedRoles.includes(role)
  })
})

const goTo = (path) => router.push(path)

const handleLogout = async () => {
  try { await authApi.logout() } catch (e) {}
  clearUser()
  userInfo.value = null
  try { router.push('/login') } catch (e) {}
  try { ElMessage.success('退出登录成功') } catch (e) {}
}

</script>

<template>
  <div class="app-layout">
    <el-container>
      <el-header>
        <div class="header-inner">
          <el-menu :default-active="activeIndex" class="el-menu-demo" mode="horizontal" style="flex:1">
            <template v-for="item in visibleNav" :key="item.name">
              <el-menu-item :index="item.name" @click="goTo(item.path)">
                <el-icon v-if="item.icon">
                  <component :is="Icons[item.icon]" />
                </el-icon>
                {{ item.title }}
              </el-menu-item>
            </template>
          </el-menu>

          <div class="header-user">
            <template v-if="userInfo">
              <el-popover v-model:visible="profileVisible" placement="bottom-end" width="300" trigger="click" popper-class="profile-popover">
                <div style="padding:12px; max-width:280px">
                  <div style="display:flex; gap:10px; align-items:center">
                    <el-icon><component :is="Icons.User" /></el-icon>
                    <div>
                      <div style="font-weight:600">{{ userInfo.name || userInfo.username || '用户' }}</div>
                      <div style="font-size:12px; color:#6b6b6b">{{ userInfo.email || userInfo.role || '' }}</div>
                    </div>
                  </div>

                  <div style="margin-top:10px; border-top:1px solid #f0f0f0; padding-top:8px; display:flex; justify-content:flex-end; gap:8px">
                    <el-button type="text" size="small" @click="openProfile">个人中心</el-button>
                    <el-button type="primary" size="small" @click="handleLogout">退出</el-button>
                  </div>
                </div>
                <template #reference>
                  <el-button type="text" style="display:flex; align-items:center; gap:6px">
                    <el-icon><component :is="Icons.User" /></el-icon>
                    {{ userInfo.name || userInfo.username || '用户' }}
                  </el-button>
                </template>
              </el-popover>
            </template>
            <template v-else>
              <el-button type="text" @click="goTo('/login')">
                <el-icon><component :is="Icons.User" /></el-icon>
                登录
              </el-button>
            </template>
          </div>
        </div>
      </el-header>

      <el-main class="layout-main">
        <el-dialog v-model:visible="profileDialog" title="个人中心" width="640px" :destroy-on-close="true">
          <Profile />
        </el-dialog>
        <div class="content-wrapper">
          <slot />
        </div>
      </el-main>

      <el-footer>
        <p>© 2023 Vue3 + Element Plus 示例项目</p>
      </el-footer>
    </el-container>
  </div>
  </template>

<style scoped>
.app-layout { min-height: 100vh; display: flex; flex-direction: column; }
.app-layout > .el-container { flex: 1; display: flex; flex-direction: column; }
.el-header { background-color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 0 16px; z-index: 10 }
.header-inner { display:flex; align-items:center; justify-content:space-between }
.header-user { margin-left: 12px }
.content-wrapper { max-width: 1200px; margin: 0 auto; width: 100% }
.layout-main { background-color: #f5f7fa; padding: 20px; flex: 1; box-sizing: border-box }
.el-footer { text-align: center; padding: 12px 0 }
.el-menu-demo { align-items: center }
</style>
