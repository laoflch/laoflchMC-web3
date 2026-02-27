<script setup>
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const searchQuery = ref(props.modelValue)
const isFocused = ref(false)
const searchResults = ref([])
const loading = ref(false)
const showResults = ref(false)

// 监听modelValue变化
watch(() => props.modelValue, (newVal) => {
  searchQuery.value = newVal
})

// 监听searchQuery变化
watch(searchQuery, (newVal) => {
  emit('update:modelValue', newVal)
})

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  // 延迟隐藏结果，以便点击结果项
  setTimeout(() => {
    isFocused.value = false
    showResults.value = false
  }, 200)
}

// 处理搜索
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    return
  }

  loading.value = true
  showResults.value = true

  try {
    // 调用豆瓣电影搜索API
    const response = await fetch(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(searchQuery.value)}`)

    if (!response.ok) {
      throw new Error('搜索失败')
    }

    const data = await response.json()

    if (data && data.items) {
      searchResults.value = data.items
    } else {
      searchResults.value = []
      ElMessage.warning('未找到相关电影')
    }
  } catch (error) {
    console.error('搜索出错:', error)
    ElMessage.error('搜索出错，请稍后重试')
    searchResults.value = []
  } finally {
    loading.value = false
  }
}

// 处理回车键
const handleKeyPress = (event) => {
  if (event.key === 'Enter') {
    handleSearch()
  }
}

// 选择电影
const selectMovie = (movie) => {
  emit('search', movie)
  showResults.value = false
}
</script>

<template>
  <div class="movie-search-container">
    <div class="search-box" :class="{ 'search-box-focused': isFocused }">
      <div class="search-icon">
        <el-icon><Search /></el-icon>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索电影..."
        class="search-input"
        @focus="handleFocus"
        @blur="handleBlur"
        @keypress="handleKeyPress"
      />
      <div class="search-actions">
        <el-button
          v-if="searchQuery"
          class="clear-button"
          :icon="Search"
          circle
          @click="searchQuery = ''"
        />
        <el-button
          type="primary"
          class="search-button"
          :loading="loading"
          @click="handleSearch"
        >
          搜索
        </el-button>
      </div>
    </div>

    <!-- 搜索结果下拉框 -->
    <div v-if="showResults && searchResults.length > 0" class="search-results">
      <div class="results-header">
        <span>搜索结果 ({{ searchResults.length }})</span>
      </div>
      <div class="results-list">
        <div
          v-for="item in searchResults"
          :key="item.id"
          class="result-item"
          @click="selectMovie(item)"
        >
          <div class="result-cover">
            <img :src="item.cover_url" :alt="item.title" />
          </div>
          <div class="result-info">
            <div class="result-title">{{ item.title }}</div>
            <div class="result-meta">{{ item.abstract }}</div>
            <div class="result-rating" v-if="item.rating && item.rating.value > 0">
              <span class="rating-value">{{ item.rating.value }}</span>
              <el-rate
                v-model="item.rating.star_count"
                disabled
                show-score
                text-color="#ff9900"
              />
              <span class="rating-count">{{ item.rating.count }} 人评价</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.movie-search-container {
  position: relative;
  width: 100%;
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

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 500px;
  overflow-y: auto;
}

.results-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 500;
  color: #303133;
  background: #f5f7fa;
}

.results-list {
  padding: 8px 0;
}

.result-item {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:hover {
  background-color: #f5f7fa;
}

.result-cover {
  width: 60px;
  height: 90px;
  margin-right: 12px;
  flex-shrink: 0;
}

.result-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-rating {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.rating-value {
  font-weight: 500;
  color: #ff9900;
  margin-right: 8px;
}

.rating-count {
  margin-left: 8px;
  color: #909399;
}
</style>
