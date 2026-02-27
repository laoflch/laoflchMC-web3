<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Layout from '@/components/layouts/Layout.vue'
import * as Icons from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { post } from '@/services/http'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL || ''
const route = useRoute()
const router = useRouter()

const movieDetail = ref(null)
const loading = ref(false)
const error = ref(null)
const showAllActors = ref(false)

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

// 获取电影详情
const fetchMovieDetail = async () => {
  const doubanId = route.params.id
  const searchText = route.query.search_text || ''

  if (!doubanId) {
    ElMessage.error('缺少电影ID')
    return
  }

  loading.value = true
  error.value = null

  console.log('doubanId:', doubanId)
  console.log('searchText:', searchText)

  try {
    const response = await post('/api/video/douban/video-info', {
      path: `https://movie.douban.com/subject/${doubanId}/`,
      query_parm: {
        search_text: searchText,
        cat: '1002'
      },
      headers: {
        
      },
      method: 'GET',
      compress: true,
      credentials: 'include',
      data_regex: ''
    })

    //console.log(response)

   // const data = JSON.parse(response.data)

    const data = response

    if (data && data.status === 1 && data.data) {
      movieDetail.value = data.data
    } else {
      throw new Error('获取电影详情失败')
    }
  } catch (err) {
    console.error('获取电影详情出错:', err)
    error.value = err.message || '获取电影详情失败，请稍后重试'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 页面加载时获取电影详情
onMounted(() => {
  fetchMovieDetail()
})

// 解析LdJsonData
const parseLdJsonData = () => {
  if (!movieDetail.value || !movieDetail.value.LdJsonData) return null

  try {
    return JSON.parse(movieDetail.value.LdJsonData)
  } catch (e) {
    console.error('解析LdJsonData失败:', e)
    return null
  }
}
</script>

<template>
  <div class="movie-detail-container">
    <Layout>
      <div class="movie-detail-content">
        <!-- 返回按钮 -->
        <el-button 
          :icon="Icons.ArrowLeft" 
          @click="goBack" 
          class="back-button"
        >
          返回
        </el-button>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-icon class="is-loading" :size="40">
            <component :is="Icons.Loading" />
          </el-icon>
          <p>加载中...</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-container">
          <el-icon :size="40" color="#f56c6c">
            <component :is="Icons.Warning" />
          </el-icon>
          <p>{{ error }}</p>
          <el-button type="primary" @click="fetchMovieDetail">重试</el-button>
        </div>

        <!-- 电影详情 -->
        <div v-else-if="movieDetail" class="detail-container">
          <!-- 基本信息卡片 -->
          <el-card class="movie-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="movie-title">{{ parseLdJsonData()?.name || '电影标题' }}</span>
              </div>
            </template>

            <div class="movie-info">
              <!-- 海报 -->
              <div class="poster-section">
                <img 
                  :src="getImageUrl(movieDetail.PosterURL)" 
                  :alt="parseLdJsonData()?.name || '电影海报'" 
                  class="movie-poster"
                />
              </div>

              <!-- 详细信息 -->
              <div class="info-section">
                <!-- 评分 -->
                <div v-if="parseLdJsonData()?.aggregateRating" class="rating-section">
                  <div class="rating-value">
                    {{ parseLdJsonData().aggregateRating.ratingValue }}
                  </div>
                  <div class="rating-count">
                    {{ parseLdJsonData().aggregateRating.ratingCount }} 人评价
                  </div>
                </div>

                <!-- 导演 -->
                <div v-if="movieDetail.MovieDetail?.Director" class="info-row">
                  <span class="info-label">导演：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.Director.join(' / ') }}</span>
                </div>

                <!-- 编剧 -->
                <div v-if="movieDetail.MovieDetail?.Screenwriter" class="info-row">
                  <span class="info-label">编剧：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.Screenwriter.join(' / ') }}</span>
                </div>

                <!-- 主演 -->
                <div v-if="movieDetail.MovieDetail?.Actor" class="info-row">
                  <span class="info-label">主演：</span>
                  <div class="info-value actors-container">
                    <span 
                      :class="['actors-text', { 'expanded': showAllActors }]"
                      @click="showAllActors = !showAllActors"
                    >
                      {{ movieDetail.MovieDetail.Actor.join(' / ') }}
                    </span>
                    
                  </div>
                </div>

                <!-- 类型 -->
                <div v-if="movieDetail.MovieDetail?.Genre" class="info-row">
                  <span class="info-label">类型：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.Genre.join(' / ') }}</span>
                </div>

                <!-- 制片国家/地区 -->
                <div v-if="movieDetail.MovieDetail?.Country" class="info-row">
                  <span class="info-label">制片国家/地区：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.Country }}</span>
                </div>

                <!-- 语言 -->
                <div v-if="movieDetail.MovieDetail?.Language" class="info-row">
                  <span class="info-label">语言：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.Language }}</span>
                </div>

                <!-- 上映日期 -->
                <div v-if="movieDetail.MovieDetail?.ReleaseDate" class="info-row">
                  <span class="info-label">上映日期：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.ReleaseDate.join(' / ') }}</span>
                </div>

                <!-- 片长 -->
                <div v-if="movieDetail.MovieDetail?.Runtime" class="info-row">
                  <span class="info-label">片长：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.Runtime }}</span>
                </div>

                <!-- 首播日期 -->
                <div v-if="movieDetail.MovieDetail?.FirstAirDate" class="info-row">
                  <span class="info-label">首播日期：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.FirstAirDate.join(' / ') }}</span>
                </div>

                <!-- 集数 -->
                <div v-if="movieDetail.MovieDetail?.EpisodeCount" class="info-row">
                  <span class="info-label">集数：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.EpisodeCount }}</span>
                </div>

                <!-- 单集时长 -->
                <div v-if="movieDetail.MovieDetail?.EpisodeLength" class="info-row">
                  <span class="info-label">单集时长：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.EpisodeLength }}</span>
                </div>

                <!-- 又名 -->
                <div v-if="movieDetail.MovieDetail?.Alias" class="info-row">
                  <span class="info-label">又名：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.Alias }}</span>
                </div>

                <!-- IMDb -->
                <div v-if="movieDetail.MovieDetail?.IMDb" class="info-row">
                  <span class="info-label">IMDb：</span>
                  <span class="info-value">{{ movieDetail.MovieDetail.IMDb }}</span>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 剧情简介卡片 -->
          <el-card class="summary-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="section-title">剧情简介</span>
              </div>
            </template>
            <div class="summary-content" v-html="movieDetail.Summary || '暂无简介'">
            </div>
          </el-card>

          <!-- 演职员表卡片 -->
          <el-card class="celebrities-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="section-title">演职员表</span>
              </div>
            </template>
            <div class="celebrities-list">
              <div 
                v-for="celebrity in movieDetail.Celebrities" 
                :key="celebrity.Link"
                class="celebrity-item"
              >
                <img 
                  :src="getImageUrl(celebrity.AvatarURL)" 
                  :alt="celebrity.FullName || celebrity.ChineseName"
                  class="celebrity-avatar"
                />
                <div class="celebrity-info">
                  <div class="celebrity-name">{{ celebrity.FullName || celebrity.ChineseName }}</div>
                  <div class="celebrity-role">{{ celebrity.Role }}</div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </Layout>
  </div>
</template>

<style scoped>
.movie-detail-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.movie-detail-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.back-button {
  margin-bottom: 20px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #909399;
}

.loading-container p,
.error-container p {
  margin-top: 20px;
  font-size: 16px;
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.movie-card,
.summary-card,
.celebrities-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.movie-title {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.movie-info {
  display: flex;
  gap: 30px;
}

.poster-section {
  flex-shrink: 0;
}

.movie-poster {
  width: 240px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.rating-section {
  display: flex;
  align-items: baseline;
  gap: 15px;
  padding: 15px;
  background-color: #f0f2f5;
  border-radius: 8px;
}

.rating-value {
  font-size: 32px;
  font-weight: bold;
  color: #ff9900;
}

.rating-count {
  font-size: 14px;
  color: #606266;
}

.info-row {
  display: flex;
  align-items: flex-start;
  line-height: 1.6;
}

.info-label {
  color: #909399;
  min-width: 120px;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
  flex: 1;
}

.actors-container {
  width: 100%;
}

.actors-text {
  display: inline;
  transition: all 0.3s;
}

.actors-text.expanded {
  display: inline;
}

.expand-hint {
  color: #409eff;
  font-weight: 500;
  margin-left: 5px;
  cursor: pointer;
}

.summary-content {
  line-height: 1.8;
  color: #606266;
  font-size: 15px;
}

.celebrities-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.celebrity-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  background-color: #f9fafb;
  transition: all 0.3s;
}

.celebrity-item:hover {
  background-color: #ecf5ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.celebrity-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.celebrity-info {
  text-align: center;
}

.celebrity-name {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
  word-break: break-all;
}

.celebrity-role {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

@media (max-width: 768px) {
  .movie-info {
    flex-direction: column;
    align-items: center;
  }

  .movie-poster {
    width: 180px;
  }

  .info-section {
    width: 100%;
  }

  .celebrities-list {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
