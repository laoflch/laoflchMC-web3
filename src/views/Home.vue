<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Layout from '@/components/layouts/Layout.vue'
import * as Icons from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { post } from '@/services/http'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL || ''

const router = useRouter()
const searchQuery = ref('')
const searchType = ref('global') // 'global' 或 'movie'
const isFocused = ref(false)
const movieSearchResults = ref([])
const showMovieResults = ref(false)
const loading = ref(false)


// 获取图片URL
const getImageUrl = (coverUrl) => {
  // 如果是默认封面图片，返回本地默认图片
  if (coverUrl === 'https://img1.doubanio.com/cuphead/movie-static/pics/movie_default_medium.png') {
    return `${imgBaseUrl}/api/image/thumbnail/movie_posters/39d129b5-d03d-353d-a20e-6a324db817a3`
  }
  // 否则返回通过代理接口获取的图片
  // 将URL中文件名之前的部分通过URL安全的base64编码作为前一个目录路径
  // 使用与Golang base64.URLEncoding兼容的编码方式
  const pathParts = coverUrl.split('/');
  const fileName = pathParts.pop();
  const directoryPath = pathParts.join('/');
  const encodedPath = btoa(directoryPath).replace(/\+/g, '-').replace(/\//g, '_');
  return `${API_BASE}/api/video/douban/image/${encodedPath}/${fileName}`;
}
// 搜索类型选项
const searchTypeOptions = [
  { value: 'global', label: '全局索引' },
  { value: 'movie', label: '豆瓣' }
]

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  // 延迟隐藏结果，以便点击结果项
  setTimeout(() => {
    isFocused.value = false
    showMovieResults.value = false
  }, 200)
}

// 执行搜索
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    return
  }

  if (searchType.value === 'global') {
    // 跳转到全局索引管理页面，并携带搜索参数
    router.push({
      path: '/global-index-management',
      query: { search: searchQuery.value }
    })
  } else {
    // 执行电影搜索
    await searchMovies()
  }
}

// 搜索电影
const searchMovies = async () => {
  if (!searchQuery.value.trim()) {
    return
  }

  loading.value = true

  try {
    // 调用后端代理接口
    const response = await post('/api/video/douban/search', {
      path: 'https://search.douban.com/movie/subject_search',
      query_parm: {
        search_text: searchQuery.value,
        cat: '1002'
      },
      headers: {
      },
      method: "GET",
      compress: true,
      credentials: "include",
      data_regex: "window\\.__DATA__\\s*=\\s*({[\\s\\S]*?});\\s*window\\.__USER__"
    })

   

    // 将JSON字符串转换为对象
    //let data = response
    //if (typeof response === 'string') {
     let data = JSON.parse(response.data)
   // }
 console.log(data)
    if (data && data.items) {
      movieSearchResults.value = data.items
      showMovieResults.value = true
    } else {
      movieSearchResults.value = []
      ElMessage.warning('未找到相关电影')
    }
  } catch (error) {
    console.error('搜索出错:', error)
    ElMessage.error('搜索出错，请稍后重试')
    movieSearchResults.value = []
    showMovieResults.value = false
  } finally {
    loading.value = false
  }
}

// 选择电影
const selectMovie = (movie) => {
  // 如果是"查看更多"项，执行更多搜索
  if (movie.tpl_name === 'search_more') {
    searchMovies()
    return
  }

  // 跳转到电影详情页面
  router.push({
    path: `/movie/${movie.id}`,
    query: { 
      search_text: searchQuery.value
    }
  })
  showMovieResults.value = false
}

// 监听搜索类型变化，清空搜索结果
const handleSearchTypeChange = () => {
  showMovieResults.value = false
  movieSearchResults.value = []
}
</script>

<template>
  <div class="home-container">
    <Layout>
      <div class="home-content">
        <div class="search-section">
         
          <div class="search-wrapper">
            <el-input
              v-model="searchQuery"
              :placeholder="searchType === 'global' ? '搜索全局索引...' : '在豆瓣搜索...'"
              class="search-input-with-select"
              @focus="handleFocus"
              @blur="handleBlur"
              @keyup.enter="handleSearch"
            >
              <template #prepend>
                <el-select
                  v-model="searchType"
                  placeholder="选择"
                  style="width: 120px"
                  @change="handleSearchTypeChange"
                >
                  <el-option
                    v-for="option in searchTypeOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </template>
              <template #append>
                <el-button :icon="Icons.Search" :loading="loading" @click="handleSearch">搜索</el-button>
              </template>
              <template #suffix>
                <el-button
                  v-if="searchQuery"
                  :icon="Icons.Close"
                  circle
                  class="clear-button"
                  @click="searchQuery = ''"
                />
              </template>
            </el-input>

            <!-- 电影搜索结果 -->
            <div v-if="showMovieResults && movieSearchResults.length > 0" class="movie-results">
              <div class="results-header">
                <span>搜索结果 ({{ movieSearchResults.length }})</span>
              </div>
              <div class="results-list">
                <div
                  v-for="item in movieSearchResults"
                  :key="item.id"
                  :class="['result-item', { 'result-divider': item.tpl_name === 'search_more' }]"
                  @click="selectMovie(item)"
                >
                  <div class="result-cover" v-if="item.tpl_name !== 'search_more'">
                    <img :src="getImageUrl(item.cover_url)" :alt="item.title" />
                  </div>
                  <div class="result-info">
                    <div class="result-title">{{ item.title }}</div>
                    <div class="result-meta" v-if="item.tpl_name !== 'search_more'">{{ item.abstract }}</div>
                    <div class="result-rating" v-if="item.rating && item.rating.value > 0 && item.tpl_name !== 'search_more'">
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

.home-content {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
}

.search-section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 24px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 20px;
  text-align: center;
}

.search-wrapper {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.search-input-with-select {
  width: 100%;
}

.clear-button {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: #909399;
}

.clear-button:hover {
  background: #f5f7fa;
}

.movie-results {
  margin-top: 20px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.results-header {
  padding: 12px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 500;
  color: #303133;
  background: #fafafa;
}

.results-list {
  padding: 8px 0;
}

.result-item {
  display: flex;
  padding: 16px 32px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 3px solid transparent;
  min-height: 140px;
}

.result-item:hover {
  background-color: #f5f7fa;
  border-left-color: #409eff;
}

.result-divider {
  display: flex;
  align-items: center;
  padding: 12px 32px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 3px solid transparent;
  min-height: auto;
  border-bottom: 1px solid #e4e7ed;
  border-top: 1px solid #e4e7ed;
  margin: 8px 0;
}

.result-divider:hover {
  background-color: #f5f7fa;
  border-left-color: #409eff;
}

.result-divider .result-info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.result-divider .result-title {
  color: #409eff;
  font-weight: 500;
}

.result-cover {
  width: 90px;
  height: 135px;
  margin-right: 20px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
}

.result-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.result-item:hover .result-cover img {
  transform: scale(1.05);
}

.result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.result-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
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
  font-weight: 600;
  color: #ff9900;
  margin-right: 8px;
  font-size: 15px;
}

.rating-count {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
