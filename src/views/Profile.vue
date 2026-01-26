<script setup>
import { onMounted, ref } from 'vue'
import { getUser } from '@/services/auth'

const user = ref(null)

onMounted(() => {
  user.value = getUser()
})
</script>

<template>
  <div class="profile-view">
    <el-card>
      <template #header>
        <div style="display:flex; align-items:center; justify-content:space-between">
          <span>个人中心</span>
        </div>
      </template>

      <div v-if="user">
        <el-descriptions title="用户信息" column="1">
          <el-descriptions-item label="用户名">{{ user.user_id }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ user.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ user.email || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <div v-else>
        <p>未检测到用户信息，请先登录。</p>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.profile-view { padding: 16px }
</style>
