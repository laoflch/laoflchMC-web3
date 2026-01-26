
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import authApi from '@/services/authApi'
import { setToken, setRefreshToken, setUser } from '@/services/auth'

const router = useRouter()

const loginForm = ref({
  user_id: '',
  password: ''
})

const loading = ref(false)
const rememberMe = ref(false)

const rules = {
  user_id: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

const loginFormRef = ref(null)

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      // 调用后端登录接口
      authApi.login({ user_id: loginForm.value.user_id, password: loginForm.value.password })
        .then((data) => {
          loading.value = false
          if (data && data.token) {
   

            ElMessage.success('登录成功')
            router.push('/')
          } else {
            ElMessage.error('登录失败：未返回 token')
          }
        })
        .catch((err) => {
          loading.value = false
          ElMessage.error(`登录失败：${err.message || err}`)
        })
    }
  })
}

const goToHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <div class="logo">
          <el-icon :size="40" color="#409eff"><User /></el-icon>
        </div>
        <h2>欢迎登录</h2>
        <p>请输入您的账号和密码</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        class="login-form"
      >
        <el-form-item prop="user_id">
          <el-input
            v-model="loginForm.user_id"
            placeholder="用户名"
            :prefix-icon="User"
            clearable
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
            size="large"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <div class="form-options">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            <el-link type="primary" :underline="false">忘记密码？</el-link>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            size="large"
            class="login-button"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <el-divider>其他登录方式</el-divider>
        <div class="social-login">
          <el-button circle size="large">
            <el-icon><User /></el-icon>
          </el-button>
          <el-button circle size="large">
            <el-icon><Lock /></el-icon>
          </el-button>
        </div>
        <el-link type="info" :underline="false" @click="goToHome" class="back-link">
          返回首页
        </el-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.login-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.1) 0%, transparent 50%);
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.login-box {
  width: 100%;
  max-width: 420px;
  padding: 48px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  margin-bottom: 16px;
}

.login-header h2 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 28px;
  font-weight: 600;
}

.login-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.login-form {
  margin-top: 24px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.login-form :deep(.el-input__wrapper) {
  padding: 8px 15px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.3s;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 8px;
}

.login-footer {
  margin-top: 32px;
}

.login-footer :deep(.el-divider__text) {
  background-color: #fff;
  padding: 0 16px;
  color: #909399;
  font-size: 13px;
}

.social-login {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 16px 0;
}

.social-login :deep(.el-button) {
  width: 44px;
  height: 44px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s;
}

.social-login :deep(.el-button:hover) {
  border-color: #409eff;
  color: #409eff;
  transform: translateY(-2px);
}

.back-link {
  display: block;
  text-align: center;
  margin-top: 16px;
  color: #909399;
  transition: color 0.3s;
}

.back-link:hover {
  color: #409eff;
}
</style>
