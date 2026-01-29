<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ArrowLeft, ArrowRight, Plus } from '@element-plus/icons-vue'
import { listMovies, createMovie, uploadImage } from '@/services/movies'
import { ElMessage } from 'element-plus'

const movies = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const cols_index=ref({})
const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL || ''
const currentPage = ref(1)
const pageSize = ref(12)
const hasMore = ref(true)
const dialogVisible = ref(false)
const selectedMovie = ref(null)
const currentScreenshotIndex = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(true)
const addDialogVisible = ref(false)
const addFormRef = ref(null)
const submitting = ref(false)

const handleImageError = (e) => {
  e.target.src = `${imgBaseUrl}/api/image/thumbnail/movie_posters/64dfe4e8-a734-3e30-83eb-c241d6f5aa57`
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
  load()

})

// 新增电影相关
const addForm = ref({
  imdb_id: '',
  douban_id: '',
  name_ch: '',
  name_en: '',
  year: '',
  director: '',
  actors: '',
  genre: '',
  country: '',
  language: '',
  duration: '',
  rating: '',
  brief_introduction: '',
  image: '',
  images: '[]',
  posterFile: null,
  screenshotFiles: []
})

// 剧照文件列表，用于显示上传的图片
const screenshotFileList = ref([])

const addFormRules = {
  imdb_id: [
    { required: true, message: '请输入IMDB ID', trigger: 'blur' }
  ],
  name_ch: [
    { required: true, message: '请输入中文名', trigger: 'blur' }
  ],
  name_en: [
    { required: true, message: '请输入英文名', trigger: 'blur' }
  ],
  year: [
    { required: true, message: '请输入年份', trigger: 'blur' }
  ]
}

const openAddDialog = () => {
  addDialogVisible.value = true
  // 重置表单
  addForm.value = {
    imdb_id: '',
    douban_id: '',
    name_ch: '',
    name_en: '',
    year: '',
    director: '',
    actors: '',
    genre: '',
    country: '',
    language: '',
    duration: '',
    rating: '',
    brief_introduction: '',
    image: '',
    images: '[]',
    posterFile: null,
    screenshotFiles: []
  }
  screenshotFileList.value = []
  // 清除验证状态
  if (addFormRef.value) {
    addFormRef.value.clearValidate()
  }
}

const handlePosterChange = async (file) => {
  try {
    const posterRes = await uploadImage(file.raw, 'movie_posters')
    addForm.value.image = posterRes.data 
    ElMessage.success('海报上传成功')
  } catch (err) {
    ElMessage.error(`海报上传失败：${err.message || err}`)
  }
}

const handleScreenshotChange = async (file, fileList) => {
  try {
    const screenshotRes = await uploadImage(file.raw, 'movie_image')
    const screenshotId = screenshotRes.data // 将上传成功的图片ID添加到images数组中
    
    // 更新截图文件列表，只保留未上传的文件
    addForm.value.screenshotFiles = fileList
      .filter(f => f.raw !== file.raw)
      .map(f => f.raw)
    
    // 将上传成功的图片ID添加到images数组中
    let images = []
    try {
      images = JSON.parse(addForm.value.images)
    } catch (e) {
      images = []
    }
    images.push(screenshotId)
    addForm.value.images = JSON.stringify(images)
    
    ElMessage.success('剧照上传成功')
  } catch (err) {
    ElMessage.error(`剧照上传失败：${err.message || err}`)
  }
}

const handleAddMovie = async () => {
  if (!addFormRef.value) return

  await addFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        // 过滤掉不需要提交的字段
        const { posterFile, screenshotFiles, ...movieData } = addForm.value
        
        // 提交电影信息
        await createMovie(movieData)
        ElMessage.success('添加电影成功')
        addDialogVisible.value = false
        // 刷新电影列表
        await load()
      } catch (err) {
        ElMessage.error(`添加电影失败：${err.message || err}`)
      } finally {
        submitting.value = false
      }
    }
  })
}
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

    <el-row :gutter="20" v-loading="loading">
      <el-col 
        v-for="movie in movies" 
        :key="movie[cols_index.imdb_id]" 
        :xs="24" 
        :sm="12" 
        :md="8" 
        :lg="6" 
        :xl="4"
      >
        <el-card class="movie-card" shadow="hover" @click="showDetail(movie)">
          <div class="movie-image">
            <img :src="imgBaseUrl +'/api/image/thumbnail/movie_posters/'+ movie[cols_index.image]" :alt="movie[cols_index.name_ch]" @error="handleImageError">
          </div>
          <div class="movie-info">
            <h4 class="movie-title">{{ movie[cols_index.name_ch] }}</h4>
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
            <img :src="imgBaseUrl + '/api/image/origin/movie_posters/' + selectedMovie[cols_index.image]" :alt="selectedMovie[cols_index.name_ch]" @error="handleImageError">
          </div>
          <div class="detail-items">
            <div class="detail-item">
              <span class="label">IMDB ID:</span>
              <span>{{ selectedMovie[cols_index.imdb_id] }}</span>
            </div>
            <div class="detail-item" v-for="(value, key) in selectedMovie" :key="key" >
              <div v-if="key !== cols_index.images && key !== cols_index.brief_introduction">
              <span class="label">{{ getColumnName(key) }}:</span>
              <span>{{ value }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="detail-info">
          <div class="movie-title">
            <h3>{{ selectedMovie[cols_index.name_ch] }}</h3>
            <p class="detail-subtitle">{{ selectedMovie[cols_index.name_en] }}</p>
          </div>
          
          <div class="movie-brief" v-if="selectedMovie[cols_index.brief_introduction]">
            <h4 class="section-title">剧情简介</h4>
            <p class="brief-content">{{ selectedMovie[cols_index.brief_introduction] }}</p>
          </div>
          
          <!-- 电影剧照导航栏 -->
          <div class="screenshots-section" v-if="selectedMovie[cols_index.images] ">
            <h4 class="section-title">电影剧照</h4>
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
    </el-dialog>

    <!-- 新增电影对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="新增电影"
      width="60%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addFormRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="16">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="中文名" prop="name_ch">
                  <el-input v-model="addForm.name_ch" placeholder="请输入中文名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="英文名" prop="name_en">
                  <el-input v-model="addForm.name_en" placeholder="请输入英文名" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="IMDB ID" prop="imdb_id">
                  <el-input v-model="addForm.imdb_id" placeholder="请输入IMDB ID" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="豆瓣ID">
                  <el-input v-model="addForm.douban_id" placeholder="请输入豆瓣ID" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="年份" prop="year">
                  <el-input v-model="addForm.year" placeholder="请输入年份" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="评分">
                  <el-input v-model="addForm.rating" placeholder="请输入评分" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="导演">
                  <el-input v-model="addForm.director" placeholder="请输入导演" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="主演">
                  <el-input v-model="addForm.actors" placeholder="请输入主演" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="类型">
                  <el-input v-model="addForm.genre" placeholder="请输入类型" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="国家/地区">
                  <el-input v-model="addForm.country" placeholder="请输入国家/地区" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="语言">
                  <el-input v-model="addForm.language" placeholder="请输入语言" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="时长">
                  <el-input v-model="addForm.duration" placeholder="请输入时长" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-col>
          <el-col :span="8">
            <el-form-item label="海报图片">
              <el-upload
                class="poster-uploader"
                :show-file-list="false"
                :on-change="handlePosterChange"
                :auto-upload="false"
                accept="image/*"
                :disabled="submitting"
              >
                <img v-if="addForm.image" :src="imgBaseUrl + '/api/image/origin/movie_posters/' + addForm.image" class="poster-preview" />
                <el-icon v-else class="poster-uploader-icon"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="剧情简介">
          <el-input
            v-model="addForm.brief_introduction"
            type="textarea"
            :rows="4"
            placeholder="请输入剧情简介"
          />
        </el-form-item>
        <el-form-item label="电影剧照">
          <el-upload
            v-model:file-list="screenshotFileList"
            list-type="picture-card"
            :on-change="handleScreenshotChange"
            :auto-upload="false"
            accept="image/*"
            multiple
            :disabled="submitting"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleAddMovie">
            {{ submitting ? '提交中...' : '确定' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
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

.movie-title {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e8eef5;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.movie-title h3 {
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
}

.detail-item {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.detail-item:hover {
  background-color: #f0f2f5;
}

.detail-item .label {
  font-weight: 600;
  min-width: 110px;
  color: #409EFF;
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

.section-title {
  margin-top: 0;
  margin-bottom: 15px;
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
</style>
