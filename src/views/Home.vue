<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Layout from '@/components/layouts/Layout.vue'
import * as Icons from '@element-plus/icons-vue'

const router = useRouter()
const globalIndexSearch = ref('')
const isFocused = ref(false)

const handleGlobalIndexSearch = () => {
  if (!globalIndexSearch.value.trim()) {
    return
  }

  // 跳转到全局索引管理页面，并携带搜索参数
  router.push({
    path: '/global-index-management',
    query: { search: globalIndexSearch.value }
  })
}

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
}
</script>

<template>
  <div class="home-container">
    <Layout>
      <div class="search-wrapper">
        <div class="search-box" :class="{ 'search-box-focused': isFocused }">
          <div class="search-icon">
            <el-icon><component :is="Icons.Search" /></el-icon>
          </div>
          <input
            v-model="globalIndexSearch"
            type="text"
            placeholder="搜索全局索引..."
            class="search-input"
            @focus="handleFocus"
            @blur="handleBlur"
            @keyup.enter="handleGlobalIndexSearch"
          />
          <div class="search-actions">
            <el-button
              v-if="globalIndexSearch"
              class="clear-button"
              :icon="Icons.Close"
              circle
              @click="globalIndexSearch = ''"
            />
            <el-button
              type="primary"
              class="search-button"
              @click="handleGlobalIndexSearch"
            >
              搜索
            </el-button>
          </div>
        </div>
      </div>
    </Layout>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.search-wrapper {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 24px;
  padding: 8px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.search-box-focused {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  margin-right: 12px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: #303133;
  background: transparent;
}

.search-input::placeholder {
  color: #a8abb2;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: #f5f7fa;
  color: #909399;
}

.clear-button:hover {
  background: #e9e9eb;
}

.search-button {
  border-radius: 20px;
  padding: 8px 24px;
}
</style>
