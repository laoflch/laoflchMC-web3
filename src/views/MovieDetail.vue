<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Layout from '@/components/layouts/Layout.vue'
import * as Icons from '@element-plus/icons-vue'
import { ElMessage, ElImageViewer } from 'element-plus'
import { post } from '@/services/http'
import { get } from '../services/http'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL || ''
const route = useRoute()
const router = useRouter()

const movieDetail = ref(null)
const loading = ref(false)
const error = ref(null)
const showAllActors = ref(false)
const imdbData = ref(null)
const imdbImages = ref([])
const loadingImdb = ref(false)
const imdbAfter = ref('')
const loadingMoreImdb = ref(false)
const imdbTotal = ref(0)
const imageRefs = ref([])
const showImageViewer = ref(false)
const initialIndex = ref(0)
const selectedImdbImages = ref(new Set())
const uploadingImages = ref(false)
const uploadProgress = ref(0)
const showUploadDrawer = ref(false)
const uploadTasks = ref([])
const syncingToRepo = ref(false)


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

// 同步电影仓库
const syncToMovieRepo = async () => {
  if (!movieDetail.value) {
    ElMessage.error('没有电影信息可同步')
    return
  }

  const doubanId = route.params.id
  if (!doubanId) {
    ElMessage.error('缺少电影ID')
    return
  }

  syncingToRepo.value = true

  try {
    // 获取电影数据
    const data = movieDetail.value

    //console.log('准备同步电影仓库，电影数据:', data)



    // 解析LdJsonData获取电影基本信息
    const ldData = parseLdJsonData()
    if (!ldData) {
      throw new Error('无法解析电影信息')
    }

    // 获取IMDb ID
    const imdbId = data.MovieDetail?.IMDb

    // 获取本地电影图片数据
    let localImages = []
    if (imdbId) {
      try {
        const imagesResponse = await get('/api/video/movie-rep/list-local-movie-images/'+imdbId)
        if (imagesResponse && imagesResponse.status === 1 && imagesResponse.data.data &&imagesResponse.data.cols_index) {
          // 抽取每行的default字段组成数组
          localImages = imagesResponse.data.data.map(item => item[imagesResponse.data.cols_index["default"]] || []).flat()
        }
      } catch (err) {
        console.error('获取本地电影图片失败:', err)
      }
    }

    // 构建电影数据，参考AddMovieDialog中的表单结构
    const movieData = {
      douban_id: doubanId,
      imdb_id: imdbId || '',
      name_ch: ldData.name ? ldData.name.split(' ')[0] : '',
      name_en: ldData.name ? ldData.name.split(' ').slice(1).join(' ') : '',
      alias: data.MovieDetail?.Alias || '',
      year: parseInt(data.MovieDetail?.Year) || (ldData.datePublished ? parseInt(ldData.datePublished.substring(0, 4)) : 1900),
      director: data.MovieDetail?.Director?.join(' / ') || '',
      screenwriter: data.MovieDetail?.Screenwriter?.join(' / ') || '',
      actors: data.MovieDetail?.Actor?.join(' / ') || '',
      genre: data.MovieDetail?.Genre?.join(' / ') || '',
      country: data.MovieDetail?.Country || '',
      language: data.MovieDetail?.Language || '',
      duration: parseInt(data.MovieDetail?.Runtime) || 0,
      rating: parseFloat(ldData.aggregateRating?.ratingValue) || 0,
      rating_count:  parseInt(ldData.aggregateRating?.ratingCount) || 0,
      brief_introduction: data.Summary || '',
      release_date: data.MovieDetail?.ReleaseDate?.join(' / ') || '',
      first_air_date: data.MovieDetail?.FirstAirDate?.join(' / ') || '',
      episode_count: parseInt(data.MovieDetail?.EpisodeCount) || 0,
      episode_length: parseInt(data.MovieDetail?.EpisodeLength) || 0,
      douban_poster_url: data.PosterURL || '',
      douban_ld_json_data: data.LdJsonData || '',//JSON.stringify(ldData) || '',
      douban_movie_detail: JSON.stringify(data.MovieDetail) || '',
      celebrities: JSON.stringify(data.Celebrities) || '',
      //image: '', // 海报图片ID，需要后续上传
      images: JSON.stringify(localImages) // 剧照图片ID数组，从接口获取的default字段数据
    }

    // 根据是否有imdb_id选择不同的接口
    if (false) {
      // 使用updateMovie接口同步到电影仓库，以imdb_id作为主键
      await post('/api/storage/update/row', { 
        table: 'movie_info', 
        row_key: imdbId,
        data: movieData 
      })
    } else {
      console.log('没有IMDb ID',imdbId)
      // 使用createMovie接口新增电影
      await post('/api/storage/insert', { 
        table: 'movie_info', 
        data: movieData 
      })
    }

    ElMessage.success('同步电影仓库成功')
  } catch (err) {
    console.error('同步电影仓库出错:', err)
    ElMessage.error(err.message || '同步电影仓库失败，请稍后重试')
  } finally {
    syncingToRepo.value = false
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

// 获取IMDb缩略图URL
const getImdbThumbnailUrl = (imageUrl) => {
  if (!imageUrl) return ''
  // IMDb的图片URL格式: https://m.media-amazon.com/images/M/xxx._V1_.jpg
  // 将其中的 _V1_ 替换为 _V1_UX200_ 来获取200px宽的缩略图
  return imageUrl.replace(/_V1_\./, '_V1_UX200_.')
}

// 处理图片点击事件
const handleImageClick = (e, image, index) => {
  // 阻止事件冒泡，避免触发其他点击事件
  e.stopPropagation()
  // 切换图片的选中状态
  const imageUrl = image.node.url
  if (selectedImdbImages.value.has(imageUrl)) {
    selectedImdbImages.value.delete(imageUrl)
  } else {
    selectedImdbImages.value.add(imageUrl)
  }
}

// 判断图片是否被选中
const isImageSelected = (image) => {
  return selectedImdbImages.value.has(image.node.url)
}

// 全选图片
const selectAllImages = () => {
  imdbImages.value.forEach(image => {
    selectedImdbImages.value.add(image.node.url)
  })
}

// 取消全选
const deselectAllImages = () => {
  selectedImdbImages.value.clear()
}

// 判断是否全部选中
const isAllSelected = () => {
  return imdbImages.value.length > 0 && selectedImdbImages.value.size === imdbImages.value.length
}

// 显示图片预览
const showImagePreview = (index) => {
  // 设置初始索引
  initialIndex.value = index
  // 显示图片查看器
  showImageViewer.value = true
}

// 获取IMDb内容
const fetchImdbContent = async (imdbId) => {
  if (!imdbId) {
    console.log('没有IMDb ID，跳过获取IMDb内容')
    return
  }

  loadingImdb.value = true
  imdbImages.value = []
  //imdbAfter.value = ''

  try {
    const response = await post('/api/video/imdb/posters-page', {
      imdb_id: imdbId,
      page_start: ''
    })

    if (response && response.status === 1 && response.data) {
      console.log(response.data)
      // 保存after值用于分页
      if (response.data.after) {
        imdbAfter.value = response.data.after
      }
      // 保存total值
      if (response.data.total !== undefined) {
        imdbTotal.value = response.data.total
      }
      imdbData.value = { ...response.data, imdbId }
      // 使用返回的图片链接
      if (Array.isArray(response.data)) {
        imdbImages.value = response.data
      } else if (response.data.edges && Array.isArray(response.data.edges)) {
        // 处理GraphQL风格的响应，提取node中的url
        imdbImages.value = response.data.edges
      } else if (response.data.images && Array.isArray(response.data.images)) {
        imdbImages.value = response.data.images
      } else if (response.data.posters && Array.isArray(response.data.posters)) {
        imdbImages.value = response.data.posters
      } else {
        console.warn('无法解析IMDb图片数据')
      }
    } else {
      console.warn('获取IMDb内容失败')
    }
  } catch (err) {
    console.error('获取IMDb内容出错:', err)
  } finally {
    loadingImdb.value = false
  }
}

// 加载更多IMDb图片
const loadMoreImdbImages = async () => {
  if (!imdbData.value || !imdbData.value.imdbId) {
    console.log('没有IMDb ID，无法加载更多图片')
    return
  }

  if (!imdbAfter.value) {
    console.log('没有更多图片可以加载')
    ElMessage.warning('没有更多剧照了')
    return
  }

  loadingMoreImdb.value = true

  //console.log('加载更多IMDb图片，imdbId:', imdbData.value.imdbId, 'after:', imdbAfter.value)

  try {
    const response = await post('/api/video/imdb/posters-page', {
      imdb_id: imdbData.value.imdbId,
      page_start: imdbAfter.value
    })

    if (response && response.status === 1 && response.data) {
     // console.log(response.data)
      // 更新after值
      if (response.data.after) {
        imdbAfter.value = response.data.after
      } else {
        imdbAfter.value = ''
      }
      // 追加新图片到列表
      let newImages = []
      if (Array.isArray(response.data)) {
        newImages = response.data
      } else if (response.data.edges && Array.isArray(response.data.edges)) {
        // 处理GraphQL风格的响应，提取node中的url
        newImages = response.data.edges
      } else if (response.data.images && Array.isArray(response.data.images)) {
        newImages = response.data.images
      } else if (response.data.posters && Array.isArray(response.data.posters)) {
        newImages = response.data.posters
      }
      
      if (newImages.length > 0) {
        imdbImages.value = [...imdbImages.value, ...newImages]
      } else {
        ElMessage.warning('没有更多剧照了')
      }
    } else {
      console.warn('获取更多IMDb图片失败')
    }
  } catch (err) {
    console.error('获取更多IMDb图片出错:', err)
    ElMessage.error('加载更多剧照失败')
  } finally {
    loadingMoreImdb.value = false
  }
}

// 格式化时间
const formatTime = (date) => {
  const d = new Date(date)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    pending: 'info',
    uploading: 'warning',
    success: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    pending: '等待中',
    uploading: '上传中',
    success: '成功',
    failed: '失败',
    cancelled: '已取消'
  }
  return texts[status] || '未知'
}

// 清空任务列表
const clearUploadTasks = () => {
  uploadTasks.value = []
  ElMessage.success('任务列表已清空')
}

// 取消单个任务
const cancelUploadTask = (task) => {
  const taskIndex = uploadTasks.value.findIndex(t => t.id === task.id)
  if (taskIndex === -1　|| uploadTasks.value[taskIndex].cancelled) {
     return // 跳过已取消的任务
  }
  // 如果任务正在上传中，标记为取消
  if (uploadTasks.value[taskIndex].status === 'uploading') {
    uploadTasks.value[taskIndex] = {
      ...uploadTasks.value[taskIndex],
      status: 'cancelled',
      cancelled: true,
      endTime: new Date()
    }
    ElMessage.success('任务已取消')
  } else if (uploadTasks.value[taskIndex].status === 'pending') {
    // 如果任务还在等待中，直接从列表中移除
    uploadTasks.value.splice(taskIndex, 1)
    ElMessage.success('任务已取消')
  }
}

// 重传失败的任务
const retryUpload = async (task) => {
  // 更新任务状态为上传中
  const taskIndex = uploadTasks.value.findIndex(t => t.id === task.id)
  if (taskIndex === -1) return
  
  uploadTasks.value[taskIndex] = {
    ...uploadTasks.value[taskIndex],
    status: 'uploading',
    progress: 0,
    error: null,
    startTime: new Date(),
    endTime: null
  }
  
  try {
    // 获取图片二进制数据，添加超时和错误处理
    let response
    try {
     
      response = await fetch(task.imageUrl, {
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'image/*'
        }
      })
      
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status} ${response.statusText}`)
      }
    } catch (fetchErr) {
      throw new Error(`获取图片失败: ${fetchErr.message}`)
    }
    
    const blob = await response.blob()
    
    if (!blob || blob.size === 0) {
      throw new Error('获取的图片数据为空')
    }

    // 创建FormData对象
    const formData = new FormData()
    formData.append('file', blob, `image_${task.id}.jpg`)
    formData.append('space_name', "movie_image")
    formData.append('image_name', task.imageUrl)
    // 查找对应的图片对象
    const image = imdbImages.value.find(img => img.node.url === task.imageUrl)
    formData.append('image_text', image?.node?.caption?.plainText || "")
    formData.append('image_comment', JSON.stringify(image?.node))
    formData.append('douban_id', route.params.id)
    formData.append('imdb_id', movieDetail.value?.MovieDetail?.IMDb)

    // 上传图片
    const result = await post('/api/image/upload', formData)

    // 更新任务状态为成功
    if (taskIndex !== -1) {
      uploadTasks.value[taskIndex] = {
        ...uploadTasks.value[taskIndex],
        status: 'success',
        progress: 100,
        rowId: result.data,
        endTime: new Date()
      }
    }

    ElMessage.success('重新上传成功')
  } catch (err) {
    console.error('重新上传图片失败:', task.imageUrl, err)

    // 更新任务状态为失败
    if (taskIndex !== -1) {
      uploadTasks.value[taskIndex] = {
        ...uploadTasks.value[taskIndex],
        status: 'failed',
        error: err.message || '上传失败',
        endTime: new Date()
      }
    }
    
    ElMessage.error(`重新上传失败: ${err.message || '未知错误'}`)
  }
}

// 上传选中的图片
const uploadSelectedImages = async () => {
  if (selectedImdbImages.value.size === 0) {
    ElMessage.warning('请先选择要上传的图片')
    return
  }

  uploadProgress.value = 0

  // 为每个文件创建独立的任务项

  try {
    const selectedUrls = Array.from(selectedImdbImages.value)
    const tasks = []

    for (let i = 0; i < selectedUrls.length; i++) {
      const url = selectedUrls[i]
      
      // 为每个文件创建独立的任务项
      const task = {
        id: Date.now() + i,
        status: 'pending',
        progress: 0,
        imageUrl: url,
        startTime: null,
        endTime: null
      }
      tasks.push(task)
      uploadTasks.value.unshift(task)
      
    }

    // 立即清除所有图片的选择状态
    selectedImdbImages.value.clear()

      for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i]
  
  // 更新任务状态为上传中
  const taskIndex = uploadTasks.value.findIndex(t => t.id === task.id)
  if (taskIndex !== -1) {
    uploadTasks.value[taskIndex] = {
      ...uploadTasks.value[taskIndex],
      status: 'uploading',
      startTime: new Date()
    }
  }
const url = task.imageUrl
 try {

        
        // 设置超时，30秒后自动取消
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('请求超时')), 60000)
        })

        // 获取图片二进制数据，添加超时控制
        const response = await Promise.race([
          fetch(url),
          timeoutPromise
        ])
        const blob = await response.blob()
        
        // 创建FormData对象
        const formData = new FormData()
        formData.append('file', blob, `image_${i}.jpg`)
        formData.append('space_name', "movie_image")
        formData.append('image_name', url)
        // 查找对应的图片对象
        const image = imdbImages.value.find(img => img.node.url === url)
        formData.append('image_text', image.node.caption.plainText || "")
        formData.append('image_comment', JSON.stringify(image.node))
        formData.append('douban_id', route.params.id)
        formData.append('imdb_id', movieDetail.value.MovieDetail.IMDb)

        //console.log('上传图片，url:', url, 'formData:', movieDetail)
        
        // 设置上传超时，60秒后自动取消
        const uploadTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('上传超时')), 60000)
        })

        // 上传图片，添加超时控制
        const result = await Promise.race([
          post('/api/image/upload', formData),
          uploadTimeoutPromise
        ])
        
        // 更新任务状态为成功
        const taskIndex = uploadTasks.value.findIndex(t => t.id === task.id)
        if (taskIndex !== -1) {
          uploadTasks.value[taskIndex] = {
            ...uploadTasks.value[taskIndex],
            status: 'success',
            progress: 100,
            rowId: result.data,
            endTime: new Date()
          }
        }
        
        //console.log('上传成功，row_id:', result.data)
      } catch (err) {
        console.error('上传图片失败:', url, err)
        
        // 更新任务状态为失败
        const taskIndex = uploadTasks.value.findIndex(t => t.id === task.id)
        if (taskIndex !== -1) {
          uploadTasks.value[taskIndex] = {
            ...uploadTasks.value[taskIndex],
            status: 'failed',
            error: err.message || '上传失败',
            endTime: new Date()
          }
        }
      }
      // 更新整体进度
      uploadProgress.value = Math.round(((i + 1) / selectedUrls.length) * 100)
}
    
    
    // 显示上传完成消息
    ElMessage.success('所有图片上传完成')
    
   
  } catch (err) {
    console.error('上传图片出错:', err)
    ElMessage.error('上传图片失败，请稍后重试')
    // 更新任务状态为失败
    if (task) {
      task.status = 'failed'
      task.error = err.message || '上传图片失败，请稍后重试'
      task.endTime = new Date()
    }
  } finally {
    uploadProgress.value = 0
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
                <!-- 评分 -->
                <div v-if="parseLdJsonData()?.aggregateRating" class="rating-section">
                  <div class="rating-value">
                    {{ parseLdJsonData().aggregateRating.ratingValue }}
                  </div>
                  <div class="rating-count">
                    {{ parseLdJsonData().aggregateRating.ratingCount }} 人评价
                  </div>
                </div>
              </div>

              <!-- 详细信息 -->
              <div class="info-section">
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
                  <el-button 
                    type="primary" 
                    size="small" 
                    :loading="loadingImdb"
                    @click="fetchImdbContent(movieDetail.MovieDetail.IMDb)"
                    class="fetch-imdb-btn"
                  >
                    {{ imdbData ? '刷新IMDb剧照' : '获取IMDb剧照' }}
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    :loading="syncingToRepo"
                    @click="syncToMovieRepo"
                    class="sync-repo-btn"
                  >
                    同步电影仓库
                  </el-button>
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

          <!-- IMDb图片卡片 -->
          <el-card v-if="imdbImages.length > 0" class="imdb-images-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="section-title">IMDb图片 ({{ imdbImages.length}}/{{imdbTotal > 0 ? imdbTotal : imdbImages.length }})</span>
                <div class="selection-controls">
                  <span class="selected-count">已选: {{ selectedImdbImages.size }}</span>
                  <el-button
                    v-if="!isAllSelected()"
                    type="primary"
                    size="small"
                    @click="selectAllImages"
                  >
                    全选
                  </el-button>
                  <el-button
                    v-else
                    type="info"
                    size="small"
                    @click="deselectAllImages"
                  >
                    取消全选
                  </el-button>
                  <el-button
                    type="warning"
                    size="small"
                    :disabled="selectedImdbImages.size === 0"
                    @click="deselectAllImages"
                  >
                    全部取消
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    :disabled="selectedImdbImages.size === 0"
                    @click="uploadSelectedImages"
                  >
                    上传选中
                  </el-button>
                  <el-button
                    type="primary"
                    size="small"
                    @click="showUploadDrawer = true"
                  >
                    查看上传任务
                  </el-button>
                </div>
              </div>
            </template>
            <div class="imdb-images-list">
              <div
                v-for="(image, index) in imdbImages"
                :key="index"
                class="imdb-image-item"
                :class="{ 'selected': isImageSelected(image) }"
                @click="handleImageClick($event, image, index)"
              >
                <el-image
                  ref="imageRefs"
                  :src="getImdbThumbnailUrl(image.node.url)"
                  fit="cover"
                  :preview-src-list="[]"
                  class="imdb-image"
                  @dblclick="showImagePreview(index)"
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon :size="30"><component :is="Icons.Picture" /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="image-overlay"></div>
                <div class="image-info">
                 
                  <div v-if="image.node.width || image.node.height" class="image-dimensions">
                    {{ image.node.width }}x{{ image.node.height }}
                  </div>
                </div>
              </div>
            </div>
            <!-- 加载更多按钮 -->
            <div v-if="imdbAfter" class="load-more-container">
              <el-button
                type="primary"
                :loading="loadingMoreImdb"
                @click="loadMoreImdbImages"
                class="load-more-btn"
              >
                {{ loadingMoreImdb ? '加载中...' : '加载更多剧照' }}
              </el-button>
            </div>

            <!-- 图片预览组件 -->
            <el-image-viewer
              v-if="showImageViewer"
              :url-list="imdbImages.map(img => img.node.url)"
              :initial-index="initialIndex"
              @close="showImageViewer = false"
            />
          </el-card>

          <el-drawer
  v-model="showUploadDrawer"
  title="上传任务"
  direction="rtl"
  size="40%"
>
    <template #header>
      <div class="drawer-header">
        <span>上传任务</span>
        <el-button
          type="danger"
          size="small"
          @click="clearUploadTasks"
          :disabled="uploadTasks.length === 0"
        >
          清空任务
        </el-button>
      </div>
    </template>
  <div v-if="uploadTasks.length === 0" class="empty-tasks">
    暂无上传任务
  </div>
  <div v-else class="upload-tasks-list">
    <div v-for="(task, index) in uploadTasks" :key="index" class="upload-task-item">

      <div class="task-content">
        <div class="task-image-preview">
          <img :src="getImdbThumbnailUrl(task.imageUrl)" alt="上传图片" class="preview-image" />
        </div>
        <div class="task-info">
          <div class="task-progress">
            <div class="task-info-left">
            <div v-if="task.imageUrl" class="task-image-url">
              {{ task.imageUrl }}
            </div>
                     
            
            
          </div>
          <div class="task-info-right">
            <div class="task-progress">
              <el-progress :percentage="task.progress" :status="task.status === 'failed' ? 'exception' : (task.status === 'success' ? 'success' : 'normal')" />
            </div>
            <div class="task-actions">
              <el-tag :type="getStatusType(task.status)">{{ getStatusText(task.status) }}</el-tag>
              <el-button v-if="task.status === 'failed'" type="primary" size="small" @click="retryUpload(task)">重传</el-button>
              <el-button v-if="task.status === 'pending' || task.status === 'uploading'" type="warning" size="small" @click="cancelUploadTask(task)">取消</el-button>
              <span v-if="task.rowId" class="task-row-id">
              row_id: {{ task.rowId }}
              </span>
              <div v-if="task.error" class="task-row-id">
              {{task.error}}
            </div>
              <span v-if="task.status === 'success' || task.status === 'uploading' || task.status === 'failed'" class="task-time">{{ formatTime(task.startTime) }}</span>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</el-drawer>

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
 
  align-items: baseline;
  gap: 15px;
  padding: 15px;
  margin-top: 15px;
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

.fetch-imdb-btn {
  margin-left: 10px;
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

.imdb-images-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selection-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  color: #67C23A;
  font-weight: bold;
}

.imdb-images-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.imdb-image-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f7fa;
  aspect-ratio: 2/3;
  transition: all 0.3s ease;
  cursor: pointer;
}

.imdb-image-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.image-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.imdb-image-item:hover .image-info {
  opacity: 1;
}

.image-caption {
  margin-bottom: 4px;
  word-break: break-all;
  line-height: 1.4;
}

.image-dimensions {
  font-size: 16px;
  color: #fff;
  text-align: center;
  padding: 4px 0;
}

.imdb-image-item.selected {
  box-shadow: 0 0 0 5px #67C23A;
}

.imdb-image-item.selected:hover {
  box-shadow: 0 0 0 5px #67C23A, 0 8px 16px rgba(103, 194, 58, 0.3);
}

.imdb-image {
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
}

.image-overlay {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  background-color: #67C23A;
  border-radius: 0;
  width: 24px;
  height: 24px;
  display: none;
  align-items: center;
  justify-content: center;
  color: white;
  padding-left: 2px;
  padding-bottom: 2px;
}

.imdb-image-item.selected .image-overlay {
  display: flex;
}

.imdb-image-item.selected .image-overlay::after {
  content: '✓';
  font-size: 16px;
  font-weight: bold;
}

.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #909399;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.load-more-btn {
  min-width: 150px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.empty-tasks {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.upload-tasks-list {
  padding: 0 20px;
}

.upload-task-item {
  margin-bottom: 20px;
  padding: 0;
  border: 1px solid #e1f3d8;
  border-radius: 8px;
  background-color: #f0f9f4;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.1);
  transition: all 0.3s ease;
}

.upload-task-item:hover {
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);
  transform: translateY(-2px);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.task-time {
  color: #909399;
  font-size: 14px;
  flex-shrink: 0;
  margin-right: 10px;
}

.task-content {
  margin-top: 10px;
  margin-left: 10px;
  display: flex;
  gap: 15px;
}

.task-image-preview {
  width: 100px;
  flex-shrink: 0;
}

.preview-image {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  border: 2px solid #67C23A;
}

.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
}

.task-info-left {
  flex: 1;
  min-width: 0;
}

.task-info-right {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.task-progress {
  width: 100%;
  margin-bottom: 10px;
  margin-top: 10px;
}

.task-images {
  color: #606266;
  font-size: 14px;
  margin-bottom: 10px;
}

.task-image-url {
  color: #67C23A;
  font-size: 16px;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.task-row-id {
  margin-top: 0px;
  color: #67C23A;
  font-weight: 500;
  font-size: 14px;
  padding: 6px 10px;
  background-color: #f0f9f4;
  border-radius: 4px;
  word-break: break-all;
  text-align: right;
  margin-left: auto;
}

.task-error {
  margin-top: 10px;
}

.task-retry {
  margin-top: 10px;
}

.task-footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e1f3d8;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
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

  .imdb-images-list {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }
}
</style>
