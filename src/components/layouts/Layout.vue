<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as Icons from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import authApi from '@/services/authApi'
import { getUser, clearUser } from '@/services/auth'
import nav from '@/config/nav'

const router = useRouter()
const route = useRoute()
const userInfo = ref(null)

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
        <el-menu :default-active="activeIndex" class="el-menu-demo" mode="horizontal">
          <template v-for="item in visibleNav" :key="item.name">
            <el-menu-item :index="item.name" @click="goTo(item.path)">
              <el-icon v-if="item.icon">
                <component :is="Icons[item.icon]" />
              </el-icon>
              {{ item.title }}
            </el-menu-item>
          </template>

          <template style="float:right">
            <template v-if="userInfo">
              <el-sub-menu index="user">
                <template #title>
                  <el-icon><component :is="Icons.User" /></el-icon>
                  {{ userInfo.name || userInfo.username || '用户' }}
                </template>
                <el-menu-item index="profile" @click="goTo('/profile')">个人中心</el-menu-item>
                <el-menu-item index="logout" @click="handleLogout">退出</el-menu-item>
              </el-sub-menu>
            </template>
            <template v-else>
              <el-menu-item index="login" @click="goTo('/login')">
                <el-icon><component :is="Icons.User" /></el-icon>
                登录
              </el-menu-item>
            </template>
          </template>
        </el-menu>
      </el-header>

      <el-main class="layout-main">
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
.el-header { background-color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 0; z-index: 10 }
.content-wrapper { max-width: 1200px; margin: 0 auto; width: 100% }
.layout-main { background-color: #f5f7fa; padding: 20px; flex: 1; box-sizing: border-box }
.el-footer { text-align: center; padding: 12px 0 }
.el-menu-demo { align-items: center }
</style>
