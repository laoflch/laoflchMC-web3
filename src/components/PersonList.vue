<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { ArrowLeft, ArrowRight, Plus, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { post, get } from '@/services/http'

const persons = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const cols_index = ref({})
const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL || ''
const currentPage = ref(1)
const pageSize = ref(12)
const hasMore = ref(true)

// 根据屏幕尺寸计算每页显示数量
const updatePageSize = () => {
  const width = window.innerWidth
  if (width < 768) {
    pageSize.value = 6
  } else if (width < 992) {
    pageSize.value = 12
  } else if (width < 1200) {
    pageSize.value = 18
  } else if (width < 1920) {
    pageSize.value = 24
  } else if (width < 3820) {
    pageSize.value = 36
  } else {
    pageSize.value = 48
  }
}

// 监听窗口大小变化
window.addEventListener('resize', updatePageSize)
const dialogVisible = ref(false)
const selectedPerson = ref(null)
const currentScreenshotIndex = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(true)
const editDialogVisible = ref(false)
const currentPersonForEdit = ref(null)
const imageLoadState = ref({})

const handleImageError = (e) => {
  e.target.src = `${imgBaseUrl}/api/image/thumbnail/movie_posters/39d129b5-d03d-353d-a20e-6a324db817a3`
}

// 获取图片URL
const getImageUrl = (coverUrl, index, type) => {
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
  
  // 检查是否需要使用webp格式
  if (index !== undefined && type !== undefined) {
    const key = `${type}_${index}`;
    if (imageLoadState.value[key]?.triedWebp) {
      // 如果已经尝试过webp格式，使用webp格式
      const dotIndex = fileName.lastIndexOf('.');
      if (dotIndex !== -1) {
        const newFileName = fileName.substring(0, dotIndex) + '.webp';
        return `${API_BASE}/api/video/douban/image/${encodedPath}/${newFileName}`;
      }
    }
  }
  
  return `${API_BASE}/api/video/douban/image/${encodedPath}/${fileName}`;
}

const showDetail = (person) => {
  // 创建人物对象的深拷贝，避免修改原始数据
  selectedPerson.value = JSON.parse(JSON.stringify(person))

  // 将images字段从JSON字符串转换为数组对象
  if (selectedPerson.value[cols_index.value.images]) {
    try {
      selectedPerson.value[cols_index.value.images] = JSON.parse(selectedPerson.value[cols_index.value.images])
      // 默认显示第一张截图
      if (selectedPerson.value[cols_index.value.images].length > 0) {
        currentScreenshotIndex.value = 0
      }
    } catch (e) {
      console.error('解析images失败', e)
      selectedPerson.value[cols_index.value.images] = []
      currentScreenshotIndex.value = null
    }
  } else {
    currentScreenshotIndex.value = null
  }

  dialogVisible.value = true
}

const handleEditPerson = (person, event) => {
  // 阻止事件冒泡，避免触发卡片点击事件
  event.stopPropagation()
  // 创建人物对象的深拷贝
  currentPersonForEdit.value = JSON.parse(JSON.stringify(person))
  editDialogVisible.value = true
}

const handleEditSuccess = () => {
  // 刷新人物列表
  loadPersons()
}

const loadPersons = () => {
  updatePageSize()
  load()
}

const getColumnName = (key) => {
  const reverseMap = Object.entries(cols_index.value).reduce((acc, [name, value]) => {
    acc[value] = name
    return acc
  }, {})
  return reverseMap[key] || key
}

const showScreenshot = (index) => {
  currentScreenshotIndex.value = index
}

const scrollScreenshots = (direction) => {
  const nav = document.querySelector('.screenshot-nav')
  if (!nav) return

  const scrollAmount = 300 * direction
  nav.scrollBy({ left: scrollAmount, behavior: 'smooth' })

  nextTick(() => {
    updateScrollButtons()
  })
}

const updateScrollButtons = () => {
  const nav = document.querySelector('.screenshot-nav')
  if (!nav) return

  canScrollLeft.value = nav.scrollLeft > 0
  canScrollRight.value = nav.scrollLeft < nav.scrollWidth - nav.clientWidth
}

const load = async () => {
  loading.value = true
  currentPage.value = 1
  try {
    const response = await post('/api/storage/query', {
      table: 'movie_person_info',
      page: currentPage.value,
      pageSize: pageSize.value
    })

    console.log('PersonList component loaded', response)

    if (response && response.status === 1 && response.data) {
      persons.value = response.data.data || []
      cols_index.value = response.data.cols_index || {}
      hasMore.value = persons.value.length >= pageSize.value
    } else {
      persons.value = []
      hasMore.value = false
    }
  } catch (err) {
    ElMessage.error(`加载影人失败：${err.message || err}`)
    persons.value = []
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value = currentPage.value + pageSize.value

  try {
    const response = await post('/api/storage/query', {
      table: 'movie_person_info',
      page: currentPage.value,
      pageSize: pageSize.value
    })

    if (response && response.status === 1 && response.data) {
      const newPersons = response.data.data || []
      persons.value = [...persons.value, ...newPersons]
      hasMore.value = newPersons.length >= pageSize.value
    } else {
      currentPage.value--
      hasMore.value = false
    }
  } catch (err) {
    currentPage.value--
    ElMessage.error(`加载更多失败：${err.message || err}`)
  } finally {
    loadingMore.value = false
  }
}

onMounted(() => {
  updatePageSize()
  load()
})

// 过滤后的人物详情项
const filteredPersonDetails = computed(() => {
  if (!selectedPerson.value) return []

  const re = Object.entries(selectedPerson.value)
    .filter(([key]) => key !== String(cols_index.value.images) && key !== String(cols_index.value.Summary) && key !== String(cols_index.value.Picture)&& key !== String(cols_index.value.AvatarURL))
    .map(([key, value]) => {
      switch(key) {
        case String(cols_index.value.ChineseNames):
          return { key, value, label: '中文名' }
        case String(cols_index.value.ForeignNames):
          return { key, value, label: '英文名' }
        case String(cols_index.value.Gender):
          return { key, value, label: '性别' }
        case String(cols_index.value.BirthDate):
          return { key, value, label: '出生日期' }
        case String(cols_index.value.BirthPlace):
          return { key, value, label: '出生地' }
        case String(cols_index.value.IMDbID):
          return { key, value, label: 'IMDB ID' }
        case String(cols_index.value.DoubanID):
          return { key, value, label: '豆瓣 ID' }
        case String(cols_index.value.Occupation):
          return { key, value, label: '职业' }
        default:
          return { key, value }
      }
    })

  return re
})
</script>

<template>
  <div class="person-list">
    <div class="header">
 
      <div class="header-actions">
        <el-button @click="loadPersons">刷新</el-button>
      </div>
    </div>

    <el-row :gutter="{ xs: 10, sm: 15, md: 20, lg: 20, xl: 20, xxl: 25, xxxl: 30 }" v-loading="loading">
      <el-col
        v-for="person in persons"
        :key="person[cols_index.default]"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="4"
        :xxl="3"
        :xxxl="2"
      >
        <el-card class="person-card" shadow="hover" @click="showDetail(person)">
          <div class="person-image">
            <img :src="getImageUrl(person[cols_index.AvatarURL], 0, 'avatar')" :alt="person[cols_index.ChineseNames]" @error="handleImageError">
          </div>
          <div class="person-info">
            <h4 class="person-title">
              {{ person[cols_index.ChineseNames] }}
              <el-icon class="edit-icon" @click="handleEditPerson(person, $event)"><Edit /></el-icon>
            </h4>
            <p class="person-subtitle">{{ person[cols_index.ForeignNames] }}</p>
            <p class="person-imdb">IMDB: {{ person[cols_index.IMDbID] }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="load-more" v-if="hasMore && persons.length > 0">
      <el-button
        type="primary"
        :loading="loadingMore"
        @click="loadMore"
        :disabled="loadingMore"
      >
        {{ loadingMore ? '加载中...' : '显示更多' }}
      </el-button>
    </div>

    <div class="no-more" v-if="!hasMore && persons.length > 0">
      <span>没有更多数据了</span>
    </div>

    <el-dialog
      v-model="dialogVisible"
      width="80%"
      class="person-detail-dialog"
      :close-on-click-modal="false"
    >
      <div class="person-detail" v-if="selectedPerson">
        <div class="detail-image">
          <div class="poster-wrapper">
            <img :src="getImageUrl(selectedPerson[cols_index.AvatarURL], 0, 'avatar')" :alt="selectedPerson[cols_index.ChineseNames]" @error="handleImageError">
          </div>
          <div class="detail-items">
            <div class="detail-item">
              <span class="label">IMDB ID:</span>
              <span>{{ selectedPerson[cols_index.IMDbID] }}</span>
            </div>
          <div class="detail-item" v-for="item in filteredPersonDetails" :key="item.key">
              <span class="label">{{ getColumnName(item.label ? item.label : item.key) }}:</span>
              <span>{{ item.value }}</span>
            </div>
          </div>
        </div>
        <div class="detail-info">
          <div class="detail-movie-title">
            <h3>{{ selectedPerson[cols_index.FullName] }}</h3>
            <p class="detail-subtitle">{{ selectedPerson[cols_index.FullName] }}</p>
          </div>

          <div class="movie-brief" v-if="selectedPerson[cols_index.Summary]">
            <h4 class="section-title">人物简介</h4>
            <p class="brief-content">{{ selectedPerson[cols_index.Summary] }}</p>
          </div>

          <!-- 人物剧照导航栏 -->
          <div class="screenshots-section" v-if="selectedPerson[cols_index.images]">
            <div class="section-title-wrapper">
              <h4 class="section-title">人物剧照</h4>
            </div>
            <div class="screenshots-container">
              <div class="screenshot-nav" ref="screenshotNav">
                <div
                  class="screenshot-item"
                  v-for="(img, index) in selectedPerson[cols_index.images]"
                  :key="index"
                  @click.stop="showScreenshot(index)"
                >
                  <img :src="imgBaseUrl + '/api/image/thumbnail/movie_image/' + img" :alt="`截图 ${index + 1}`">
                </div>
              </div>
              <div class="nav-buttons">
                <el-button circle size="small" @click="scrollScreenshots(-1)" :disabled="!canScrollLeft">
                  <el-icon><ArrowLeft /></el-icon>
                </el-button>
                <el-button circle size="small" @click="scrollScreenshots(1)" :disabled="!canScrollRight">
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>

            <!-- 剧照预览 -->
            <div class="screenshot-preview" v-if="currentScreenshotIndex !== null">
              <img :src="imgBaseUrl + '/api/image/origin/movie_image/' + selectedPerson[cols_index.images][currentScreenshotIndex]" :alt="`剧照 ${currentScreenshotIndex + 1}`">
            <div class="preview-info">
                <span>{{ currentScreenshotIndex + 1 }} / {{ selectedPerson[cols_index.images].length }}</span>
                <el-button size="small" @click="currentScreenshotIndex = null">关闭预览</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.person-list {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h3 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.person-card {
  margin-bottom: 20px;
  transition: transform 0.3s;
  height: 100%;
  cursor: pointer;
}

.person-card:hover {
  transform: translateY(-5px);
}

.person-image {
  width: 100%;
  padding-top: 150%;
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.person-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-info {
  padding-top: 12px;
}

.person-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-icon {
  margin-left: 8px;
  cursor: pointer;
  color: #409EFF;
  flex-shrink: 0;
}

.person-subtitle {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-imdb {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.load-more, .no-more {
  text-align: center;
  margin-top: 20px;
}

.no-more {
  color: #909399;
}

.person-detail-dialog .el-dialog__body {
  padding: 30px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  max-height: none;
  overflow: visible;
}

.person-detail-dialog .el-dialog__headerbtn {
  font-size: 24px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.person-detail-dialog .el-dialog__close {
  font-size: 40px;
  font-weight: bold;
}

.person-detail-dialog .el-dialog__headerbtn:hover {
  background-color: #e6f7ff;
  color: #409eff;
}

.person-detail {
  display: flex;
  gap: 40px;
  max-height: none;
  overflow: visible;
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.detail-image {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.poster-wrapper {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: transform 0.3s ease;
}

.poster-wrapper:hover {
  transform: scale(1.02);
}

.poster-wrapper img {
  width: 100%;
  display: block;
}

.detail-items {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}

.detail-item {
  margin-bottom: 14px;
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.detail-item > div {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.detail-item:hover {
  background-color: #f0f2f5;
}

.detail-item .label {
  font-weight: 600;
  min-width: 110px;
  color: #409EFF;
  padding-top: 4px;
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: visible;
}

.detail-person-title {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e8eef5;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.detail-person-title h3 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 0.5px;
}

.detail-subtitle {
  font-size: 18px;
  color: #606266;
  margin: 0;
  font-style: italic;
  text-align: left;
}

.person-brief {
  margin-bottom: 20px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 18px;
  color: #303133;
  flex-shrink: 0;
}

.brief-content {
  margin: 0;
  line-height: 1.6;
  color: #303133;
}

.screenshots-section {
  margin-top: 30px;
  min-height: 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.screenshots-section::-webkit-scrollbar {
  display: none;
}

.section-title-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.screenshots-container {
  position: relative;
  width: 100%;
}

.screenshot-nav {
  display: flex;
  gap: 10px;
  overflow-x: hidden;
  scroll-behavior: smooth;
  padding: 10px 0;
  scrollbar-width: none;
}

.screenshot-nav::-webkit-scrollbar {
  display: none;
}

.screenshot-item {
  flex: 0 0 200px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.screenshot-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.screenshot-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-buttons {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 5px;
  pointer-events: none;
}

.nav-buttons .el-button {
  pointer-events: auto;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.screenshot-preview {
  margin-top: 20px;
  text-align: center;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f7fa;
  flex-shrink: 0;
}

.screenshot-preview img {
  max-width: 100%;
  object-fit: contain;
}
</style>

<style>
/* 添加针对超大屏幕的媒体查询 */
@media (min-width: 3820px) {
  .movie-list .el-row .el-col {
    width: calc(100% / 12) ;
    flex: 0 0 calc(100% / 12) ;
    max-width: calc(100% / 12) ;
    box-sizing: border-box ;
    padding-right: 15px ;
    padding-left: 15px ;
  }
  
  .movie-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -15px ;
    margin-left: -15px ;
  }
}
/*
/* 针对不同屏幕尺寸的响应式布局 */
@media (min-width: 2560px) and (max-width: 3819px) {
  .person-list .el-row .el-col {
    width: calc(100% / 8) ;
    flex: 0 0 calc(100% / 8) ;
    max-width: calc(100% / 8) ;
    box-sizing: border-box ;
    padding-right: 15px ;
    padding-left: 15px ;
  }
  
  .person-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -15px ;
    margin-left: -15px ;
  }
}

@media (min-width: 1920px) and (max-width: 2559px) {
  .person-list .el-row .el-col {
    width: calc(100% / 6) ;
    flex: 0 0 calc(100% / 6) ;
    max-width: calc(100% / 6) !;
    box-sizing: border-box ;
    padding-right: 15px ;
    padding-left: 15px ;
  }
  
  .person-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -15px ;
    margin-left: -15px 
  }
}

@media (min-width: 1200px) and (max-width: 1919px) {
  .person-list .el-row .el-col {
    width: calc(100% / 4) ;
    flex: 0 0 calc(100% / 4) ;
    max-width: calc(100% / 4) ;
    box-sizing: border-box ;
    padding-right: 10px ;
    padding-left: 10px ;
  }
  
  .person-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -10px ;
    margin-left: -10px ;
  }
}

@media (min-width: 992px) and (max-width: 1199px) {
  .person-list .el-row .el-col {
    width: calc(100% / 3) ;
    flex: 0 0 calc(100% / 3) ;
    max-width: calc(100% / 3) ;
    box-sizing: border-box ;
    padding-right: 10px ;
    padding-left: 10px ;
  }
  
  .person-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -10px ;
    margin-left: -10px ;
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .person-list .el-row .el-col {
    width: calc(100% / 2) ;
    flex: 0 0 calc(100% / 2) ;
    max-width: calc(100% / 2) ;
    box-sizing: border-box ;
    padding-right: 7.5px ;
    padding-left: 7.5px ;
  }
  
  .person-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -7.5px ;
    margin-left: -7.5px ;
  }
}

@media (max-width: 767px) {
  .person-list .el-row .el-col {
    width: 100% ;
    flex: 0 0 100% ;
    max-width: 100% ;
    box-sizing: border-box ;
    padding-right: 5px ;
    padding-left: 5px ;
  }
  
  .person-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -5px ;
    margin-left: -5px ;
  }
}
*/
/* 强制应用样式 */
.person-list .el-row .el-col {
  transition: all 0.3s ease ;
}


</style>

