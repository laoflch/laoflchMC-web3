<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { ArrowLeft, ArrowRight, Plus, Edit } from '@element-plus/icons-vue'
import { listMovies, uploadImage } from '@/services/movies'
import { ElMessage } from 'element-plus'
import AddMovieDialog from './AddMovieDialog.vue'
import EditMovieDialog from './EditMovieDialog.vue'

const movies = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const cols_index=ref({})
const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL || ''
const currentPage = ref(1)
const pageSize = ref(12)
const hasMore = ref(true)

// 根据屏幕尺寸计算每页显示数量
const updatePageSize = () => {
  const width = window.innerWidth
  //console.log('窗口宽度:', width)
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
  } else{
    pageSize.value = 48
  }
}

// 监听窗口大小变化
window.addEventListener('resize', updatePageSize)
const dialogVisible = ref(false)
const selectedMovie = ref(null)
const currentScreenshotIndex = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(true)
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const currentMovieForEdit = ref(null)
const screenshotUploadVisible = ref(false)
const uploadingScreenshots = ref(false)
const newScreenshotFiles = ref([])
const activeUploadTab = ref('upload')
const urlForm = ref({
  imageUrl: ''
})

const handleImageError = (e) => {
  e.target.src = `${imgBaseUrl}/api/image/thumbnail/movie_posters/39d129b5-d03d-353d-a20e-6a324db817a3`
}

const showDetail = (movie) => {
  // 创建电影对象的深拷贝，避免修改原始数据
  selectedMovie.value = JSON.parse(JSON.stringify(movie))
  
  // 将images字段从JSON字符串转换为数组对象
  if (selectedMovie.value[cols_index.value.images]) {
    try {
      selectedMovie.value[cols_index.value.images] = JSON.parse(selectedMovie.value[cols_index.value.images])
      // 默认显示第一张截图
      if (selectedMovie.value[cols_index.value.images].length > 0) {
        currentScreenshotIndex.value = 0
      }
    } catch (e) {
      console.error('解析images失败', e)
      selectedMovie.value[cols_index.value.images] = []
      currentScreenshotIndex.value = null
    }
  } else {
    currentScreenshotIndex.value = null
  }
  
  dialogVisible.value = true
}

const handleEditMovie = (movie, event) => {
  // 阻止事件冒泡，避免触发卡片点击事件
  event.stopPropagation()
  // 创建电影对象的深拷贝
  currentMovieForEdit.value = JSON.parse(JSON.stringify(movie))
  editDialogVisible.value = true
}

const handleEditSuccess = () => {
  // 刷新电影列表
  loadMovies()
}

const loadMovies= () => {
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
    const raw = await listMovies({ page: currentPage.value, pageSize: pageSize.value })
    console.log('MovieList component mounted', raw)
    let data = raw
    if (Array.isArray(raw)) {
      data = { data: { data: raw } }
    }

    movies.value = (data && data.data && Array.isArray(data.data.data)) ? data.data.data : []
    cols_index.value=data.data.cols_index
    hasMore.value = movies.value.length >= pageSize.value
    console.log('MovieList loaded', movies.value)
  } catch (err) {
    if (typeof ElMessage !== 'undefined') {
      ElMessage.error(`加载电影失败：${err.message || err}`)
    } else {
      console.error('加载电影失败', err)
    }
    movies.value = []
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  currentPage.value = currentPage.value + pageSize.value
  
  try {
    const raw = await listMovies({ page: currentPage.value, pageSize: pageSize.value })
    let data = raw
    if (Array.isArray(raw)) {
      data = { data: { data: raw } }
    }

    const newMovies = (data && data.data && Array.isArray(data.data.data)) ? data.data.data : []
    movies.value = [...movies.value, ...newMovies]
    hasMore.value = newMovies.length >= pageSize.value
  } catch (err) {
    currentPage.value--
    if (typeof ElMessage !== 'undefined') {
      ElMessage.error(`加载更多失败：${err.message || err}`)
    } else {
      console.error('加载更多失败', err)
    }
  } finally {
    loadingMore.value = false
  }
}

onMounted(() => {
  updatePageSize()
  load()

})

// 新增电影相关
const openAddDialog = () => {
  addDialogVisible.value = true
}

const handleAddSuccess = () => {
  // 刷新电影列表
  load()
}



// const handlePosterChange = async (file) => {
//   try {
//     const posterRes = await uploadImage(file.raw, 'movie_posters')
//     addForm.value.image = posterRes.data 
//     ElMessage.success('海报上传成功')
//   } catch (err) {
//     ElMessage.error(`海报上传失败：${err.message || err}`)
//   }
// }

// const handleScreenshotChange = async (file, fileList) => {
//   try {
//     const screenshotRes = await uploadImage(file.raw, 'movie_image')
//     const screenshotId = screenshotRes.data // 将上传成功的图片ID添加到images数组中
    
//     // 更新截图文件列表，只保留未上传的文件
//     addForm.value.screenshotFiles = fileList
//       .filter(f => f.raw !== file.raw)
//       .map(f => f.raw)
    
//     // 将上传成功的图片ID添加到images数组中
//     let images = []
//     try {
//       images = JSON.parse(addForm.value.images)
//     } catch (e) {
//       images = []
//     }
//     images.push(screenshotId)
//     addForm.value.images = JSON.stringify(images)
    
//     ElMessage.success('剧照上传成功')
//   } catch (err) {
//     ElMessage.error(`剧照上传失败：${err.message || err}`)
//   }
// }

// const handleAddMovie = async () => {
//   if (!addFormRef.value) return

//   await addFormRef.value.validate(async (valid) => {
//     if (valid) {
//       submitting.value = true
//       try {
//         // 过滤掉不需要提交的字段
//         const { posterFile, screenshotFiles, ...movieData } = addForm.value
        
//         // 提交电影信息
//         await createMovie(movieData)
//         ElMessage.success('添加电影成功')
//         addDialogVisible.value = false
//         // 刷新电影列表
//         await load()
//       } catch (err) {
//         ElMessage.error(`添加电影失败：${err.message || err}`)
//       } finally {
//         submitting.value = false
//       }
//     }
//   })
// }

// // 打开上传剧照对话框
// const openScreenshotUpload = () => {
//   newScreenshotFiles.value = []
//   screenshotUploadVisible.value = true
// }

// // 处理新增剧照文件变化
// const handleNewScreenshotChange = async (file, fileList) => {
//   try {
//     uploadingScreenshots.value = true
//     const screenshotRes = await uploadImage(file.raw, 'movie_image')
//     const screenshotId = screenshotRes.data

//     // 更新截图文件列表
//     newScreenshotFiles.value = fileList

//     // 将上传成功的图片ID添加到当前电影的images数组中
//     if (selectedMovie.value && selectedMovie.value[cols_index.value.images]) {
//       let images = [...selectedMovie.value[cols_index.value.images]]
//       images.push(screenshotId)
//       selectedMovie.value[cols_index.value.images] = images
//     }

//     ElMessage.success('剧照上传成功')
//   } catch (err) {
//     ElMessage.error(`剧照上传失败：${err.message || err}`)
//   } finally {
//     uploadingScreenshots.value = false
//   }
// }

// // 关闭上传剧照对话框
// const closeScreenshotUpload = () => {
//   screenshotUploadVisible.value = false
//   newScreenshotFiles.value = []
//   urlForm.value.imageUrl = ''
// }


// // 通过URL添加图片
// const addImageByUrl = async () => {
//   if (!urlForm.value.imageUrl) {
//     ElMessage.warning('请输入图片URL')
//     return
//   }

//   try {
//     uploadingScreenshots.value = true

//     // 从URL下载图片并上传到服务器
//     const response = await fetch(urlForm.value.imageUrl)
//     if (!response.ok) {
//       throw new Error('无法获取图片')
//     }

//     const blob = await response.blob()
//     const file = new File([blob], urlForm.value.imageUrl, { type: blob.type })

//     // 上传图片到服务器
//     const screenshotRes = await uploadImage(file, 'movie_image')
//     const screenshotId = screenshotRes.data

//     // 将上传成功的图片ID添加到当前电影的images数组中
//     if (selectedMovie.value && selectedMovie.value[cols_index.value.images]) {
//       let images = [...selectedMovie.value[cols_index.value.images]]
//       images.push(screenshotId)
//       selectedMovie.value[cols_index.value.images] = images
//     }

//     ElMessage.success('剧照添加成功')
//     urlForm.value.imageUrl = ''
//   } catch (err) {
//     ElMessage.error(`剧照添加失败：${err.message || err}`)
//   } finally {
//     uploadingScreenshots.value = false
//   }


// }

  // 过滤后的电影详情项
const filteredMovieDetails = computed(() => {
  if (!selectedMovie.value) return []
  
   const re=Object.entries(selectedMovie.value)
    .filter(([key]) => key !== String(cols_index.value.images) && key !== String(cols_index.value.brief_introduction))
    .map(([key, value]) => {
      switch(key) {
        case String(cols_index.value.name_ch):
          return { key, value, label: '中文名称' }
        case String(cols_index.value.name_en):
          return { key, value, label: '英文名称' }
        case String(cols_index.value.release_date):
          return { key, value, label: '上映日期' }
        case String(cols_index.value.duration):
          return { key, value, label: '时长' }
        case String(cols_index.value.director):
          return { key, value, label: '导演' }
        case String(cols_index.value.actors):
          return { key, value, label: '演员' }
        case String(cols_index.value.genre):
          return { key, value, label: '类型' }
        case String(cols_index.value.country):
          return { key, value, label: '国家' }
        case String(cols_index.value.language):
          return { key, value, label: '语言' }
        case String(cols_index.value.imdb_id):
          return { key, value, label: 'IMDB ID' }
        case String(cols_index.value.douban_id):
          return { key, value, label: '豆瓣 ID' }
        case String(cols_index.value.year):
          return { key, value, label: '年份' }
        case String(cols_index.value.rating):
          return { key, value, label: '评分' }
  
        default:
          return { key, value }
      }
    })
    console.log('filteredMovieDetails', selectedMovie.value, re,cols_index.value.images)

    return re
})
</script>

<template>
  <div class="movie-list">
    <div class="header">
      <h3>电影列表</h3>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">新增电影</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-row :gutter="{ xs: 10, sm: 15, md: 20, lg: 20, xl: 20, xxl: 25, xxxl: 30 }" v-loading="loading">
      <el-col 
        v-for="movie in movies" 
        :key="movie[cols_index.default]" 
        :xs="24" 
        :sm="12" 
        :md="8" 
        :lg="6" 
        :xl="4"
        :xxl="3"
        :xxxl="2"
      >
        <el-card class="movie-card" shadow="hover" @click="showDetail(movie)">
          <div class="movie-image">
            <img :src="imgBaseUrl +'/api/image/thumbnail/movie_image/'+ movie[cols_index.image]" :alt="movie[cols_index.name_ch]" @error="handleImageError">
          </div>
          <div class="movie-info">
            <h4 class="movie-title">
              {{ movie[cols_index.name_ch] }}
              <el-icon class="edit-icon" @click="handleEditMovie(movie, $event)"><Edit /></el-icon>
            </h4>
            <p class="movie-subtitle">{{ movie[cols_index.name_en] }}</p>
            <p class="movie-imdb">IMDB: {{ movie[cols_index.imdb_id] }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <div class="load-more" v-if="hasMore && movies.length > 0">
      <el-button 
        type="primary" 
        :loading="loadingMore" 
        @click="loadMore"
        :disabled="loadingMore"
      >
        {{ loadingMore ? '加载中...' : '显示更多' }}
      </el-button>
    </div>
    
    <div class="no-more" v-if="!hasMore && movies.length > 0">
      <span>没有更多数据了</span>
    </div>
    
    <el-dialog
      v-model="dialogVisible"
     
      width="80%"
      class="movie-detail-dialog"
      :close-on-click-modal="false"
    >
      <div class="movie-detail" v-if="selectedMovie">
        <div class="detail-image">
          <div class="poster-wrapper">
            <img :src="imgBaseUrl + '/api/image/origin/movie_image/' + selectedMovie[cols_index.image]" :alt="selectedMovie[cols_index.name_ch]" @error="handleImageError">
          </div>
          <div class="detail-items">
            <div class="detail-item">
              <span class="label">IMDB ID:</span>
              <span>{{ selectedMovie[cols_index.imdb_id] }}</span>
            </div>
          <div class="detail-item" v-for="item in filteredMovieDetails" :key="item.key">
              <span class="label">{{ getColumnName(item.label?item.label:item.key) }}:</span>
              <span>{{ item.value }}</span>              
            </div>
          </div>
        </div>
        <div class="detail-info">
          <div class="detail-movie-title">
            <h3>{{ selectedMovie[cols_index.name_ch] }}</h3>
            <p class="detail-subtitle">{{ selectedMovie[cols_index.name_en] }}</p>
          </div>
          
          <div class="movie-brief" v-if="selectedMovie[cols_index.brief_introduction]">
            <h4 class="section-title">剧情简介</h4>
            <p class="brief-content">{{ selectedMovie[cols_index.brief_introduction] }}</p>
          </div>
          
          <!-- 电影剧照导航栏 -->
          <div class="screenshots-section" v-if="selectedMovie[cols_index.images] ">
            <div class="section-title-wrapper">
              <h4 class="section-title">电影剧照</h4>

            </div>
            <div class="screenshots-container">
              <div class="screenshot-nav" ref="screenshotNav">
                <div 
                  class="screenshot-item" 
                  v-for="(img, index) in selectedMovie[cols_index.images]" 
                  :key="index"
                  @click="showScreenshot(index)"
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
              <img :src="imgBaseUrl + '/api/image/origin/movie_image/' + selectedMovie[cols_index.images][currentScreenshotIndex]" :alt="`剧照 ${currentScreenshotIndex + 1}`">
              <div class="preview-info">
                <span>{{ currentScreenshotIndex + 1 }} / {{ selectedMovie[cols_index.images].length }}</span>
                <el-button size="small" @click="currentScreenshotIndex = null">关闭预览</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
          
        </div>
      </template>
    </el-dialog>





    <!-- 新增电影对话框 -->
    <AddMovieDialog
      v-model="addDialogVisible"
      :img-base-url="imgBaseUrl"
      @success="handleAddSuccess"
    />
    
    <!-- 编辑电影对话框 -->
    <EditMovieDialog
      v-model="editDialogVisible"
      :movie-data="currentMovieForEdit"
      :cols-index="cols_index"
      :img-base-url="imgBaseUrl"
      @success="handleEditSuccess"
    />
  </div>
</template>

<style scoped>
.movie-list {
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
}

.poster-uploader {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 200px;
  height: 300px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.poster-uploader:hover {
  border-color: #409EFF;
}

.poster-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.poster-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.movie-card {
  margin-bottom: 20px;
  transition: transform 0.3s;
  height: 100%;
  cursor: pointer;
}

.movie-card:hover {
  transform: translateY(-5px);
}

.movie-detail-dialog .el-dialog__body {
  padding: 30px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  max-height: none;
  overflow: visible;
}

.movie-detail-dialog .el-dialog__headerbtn {
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

.movie-detail-dialog .el-dialog__close {
  font-size: 40px;
  font-weight: bold;
}

.movie-detail-dialog .el-dialog__headerbtn:hover {
  background-color: #e6f7ff;
  color: #409eff;
}

.movie-detail {
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

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: visible;
}

.detail-movie-title {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e8eef5;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.detail-movie-title h3 {
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

.section-title {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 18px;
  color: #303133;
  flex-shrink: 0;
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

.preview-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #f5f7fa;
}

.movie-image {
  width: 100%;
  padding-top: 150%;
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.movie-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.movie-info {
  padding-top: 12px;
}

.movie-title {
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

.movie-subtitle {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-imdb {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.load-more {
  text-align: center;
  margin-top: 20px;
  padding: 20px 0;
}

.no-more {
  text-align: center;
  margin-top: 20px;
  padding: 20px 0;
  color: #909399;
}

.upload-tabs {
  margin-top: 10px;
}

.url-upload-container {
  padding: 20px 0;
}

.url-preview {
  margin-top: 20px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 10px;
  max-height: 400px;
  overflow: auto;
}

.url-preview img {
  max-width: 100%;
  max-height: 380px;
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
  .movie-list .el-row .el-col {
    width: calc(100% / 8) ;
    flex: 0 0 calc(100% / 8) ;
    max-width: calc(100% / 8) ;
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

@media (min-width: 1920px) and (max-width: 2559px) {
  .movie-list .el-row .el-col {
    width: calc(100% / 6) ;
    flex: 0 0 calc(100% / 6) ;
    max-width: calc(100% / 6) !;
    box-sizing: border-box ;
    padding-right: 15px ;
    padding-left: 15px ;
  }
  
  .movie-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -15px ;
    margin-left: -15px 
  }
}

@media (min-width: 1200px) and (max-width: 1919px) {
  .movie-list .el-row .el-col {
    width: calc(100% / 4) ;
    flex: 0 0 calc(100% / 4) ;
    max-width: calc(100% / 4) ;
    box-sizing: border-box ;
    padding-right: 10px ;
    padding-left: 10px ;
  }
  
  .movie-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -10px ;
    margin-left: -10px ;
  }
}

@media (min-width: 992px) and (max-width: 1199px) {
  .movie-list .el-row .el-col {
    width: calc(100% / 3) ;
    flex: 0 0 calc(100% / 3) ;
    max-width: calc(100% / 3) ;
    box-sizing: border-box ;
    padding-right: 10px ;
    padding-left: 10px ;
  }
  
  .movie-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -10px ;
    margin-left: -10px ;
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .movie-list .el-row .el-col {
    width: calc(100% / 2) ;
    flex: 0 0 calc(100% / 2) ;
    max-width: calc(100% / 2) ;
    box-sizing: border-box ;
    padding-right: 7.5px ;
    padding-left: 7.5px ;
  }
  
  .movie-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -7.5px ;
    margin-left: -7.5px ;
  }
}

@media (max-width: 767px) {
  .movie-list .el-row .el-col {
    width: 100% ;
    flex: 0 0 100% ;
    max-width: 100% ;
    box-sizing: border-box ;
    padding-right: 5px ;
    padding-left: 5px ;
  }
  
  .movie-list .el-row {
    display: flex ;
    flex-wrap: wrap ;
    margin-right: -5px ;
    margin-left: -5px ;
  }
}
*/
/* 强制应用样式 */
.movie-list .el-row .el-col {
  transition: all 0.3s ease ;
}


</style>
