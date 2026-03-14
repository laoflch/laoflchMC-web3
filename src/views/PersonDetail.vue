<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Layout from '@/components/layouts/Layout.vue'
import * as Icons from '@element-plus/icons-vue'
import { ElMessage, ElImageViewer } from 'element-plus'
import { post, get } from '@/services/http'
import io from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL || ''
const route = useRoute()
const router = useRouter()

// WebSocket相关
const websocket = ref(null)
const wsConnected = ref(false)
const asyncTasks = ref([])

// Socket.IO连接配置
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:18081'
const SOCKET_RECONNECT_ATTEMPTS = 10 // 最大重连次数
const SOCKET_RECONNECT_DELAY = 3000 // 重连间隔3秒

// 任务状态类型
const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed'
}

const personDetail = ref(null)
const loading = ref(false)
const error = ref(null)
const imdbImages = ref([])
const imageLoadState = ref({})
const loadingImdb = ref(false)
const imdbCursor = ref('')
const imdbHasNext = ref(false)
const loadingMoreImdb = ref(false)
const imdbTotal = ref(0)
const showImageViewer = ref(false)
const initialIndex = ref(0)
const showDoubanImageViewer = ref(false)
const doubanInitialIndex = ref(0)
const selectedImdbImages = ref(new Set())
const uploadProgress = ref(0)
const showUploadDrawer = ref(false)
const uploadTasks = ref([])
const syncingToRepo = ref(false)
const showDoubanNav = ref(true)
const showSummaryNav = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(true)
// 批次任务展开状态
const expandedTasks = ref([])




const scrollScreenshots = (direction) => {
  const nav = document.querySelector('.douban-images-list')
  if (!nav) return
  
  

  const scrollAmount = 300 * direction
  nav.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  
  nextTick(() => {
    updateScrollButtons(direction)
    // console.log('更新滚动按钮状态:', {
    //   canScrollLeft: canScrollLeft.value,
    //   canScrollRight: canScrollRight.value
    // })
  })
}

const updateScrollButtons = async (direction) => {
  const nav = document.querySelector('.douban-images-list')
  if (!nav) return

  //console.log('更新滚动按钮状态，当前scrollRight:', nav.canScrollRight, 'scrollWidth:', nav.scrollWidth, 'clientWidth:', nav.clientWidth)
  
  canScrollLeft.value = nav.scrollLeft > 0
  canScrollRight.value = nav.scrollLeft < nav.scrollWidth - nav.clientWidth-300
    //canScrollRight.value = nav.scrollR > 0

// 如果向右滚动且无法继续滚动，则加载更多图片
if (direction === 1 && !canScrollRight.value && personDetail.value?.Picture?.Pictures?.length > 0) {
  let old_photo_id = ''
  // 从前往后循环调用 loadMoreDoubanImages
  for (let i = personDetail.value.Picture.Pictures.length - 1; i >= 0; i--) {
    const photoId = personDetail.value.Picture.Pictures[i].PhotoID;
    if(photoId!==old_photo_id){
       const result = await loadMoreDoubanImages('right', photoId);
       old_photo_id = photoId
       //console.log('加载更多豆瓣图片响应:', result,i,personDetail.value.Picture.Pictures.length,photoId)
       // 如果返回值是 true，则中断循环
    if (result) {
      break;
    }
      if(i===0){
      ElMessage.info('没有更多图片了')


  }
    }else{
       continue
    }
    
    
    
  }
  return
}else if (direction === -1 && !canScrollLeft.value && personDetail.value?.Picture?.Pictures?.length > 0) {// 如果向右滚动且无法继续滚动，则加载更多图片
   let old_photo_id = ''
  // 从后往前循环调用 loadMoreDoubanImages
  for (let i = 0; i < personDetail.value.Picture.Pictures.length; i++) {
    const photoId = personDetail.value.Picture.Pictures[i].PhotoID;
     if(photoId!==old_photo_id){
    const result = await loadMoreDoubanImages('left', photoId);
    old_photo_id = photoId
    //console.log('加载更多豆瓣图片响应:', result,i,personDetail.value.Picture.Pictures.length,photoId)

    // 如果返回值是 true，则中断循环
    if (result) {

     break;
  }
  if(i===personDetail.value.Picture.Pictures.length-1){
      ElMessage.info('没有更多图片了')


  }
   }else{
       continue
    }
}
}

}
// 切换批次任务的展开/收起状态
const toggleSubTasks = (taskId) => {
  const index = expandedTasks.value.indexOf(taskId)
  if (index === -1) {
    expandedTasks.value.push(taskId)
  } else {
    expandedTasks.value.splice(index, 1)
  }
}

// 根据子任务ID获取子任务对象
const getSubTaskById = (subTaskId) => {
  return asyncTasks.value.find(task => task.id === subTaskId)
}

// 清空异步任务列表
const clearAsyncTasks = () => {
  asyncTasks.value = []
  expandedTasks.value = []
  ElMessage.success('任务列表已清空')
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

// 处理豆瓣图片加载失败，尝试使用webp格式
const handleDoubanImageError = (event, index, type) => {
  // 如果没有提供index和type，返回
  if (index === undefined || type === undefined) {
    return;
  }
  
  // 创建唯一键
  const key = `${type}_${index}`;
  
  // 如果已经尝试过webp格式，不再重试
  if (imageLoadState.value[key]?.triedWebp) {
    return;
  }
  
  // 标记已尝试webp格式
  imageLoadState.value[key] = {
    ...imageLoadState.value[key],
    triedWebp: true
  };
}

// 初始化Socket.IO连接
const initWebSocket = () => {
  // 如果连接已存在且已连接，则不重新创建连接
  if (websocket.value && wsConnected.value) {
    console.log('WebSocket连接已存在，跳过重新连接')
    return
  }

  // 如果连接存在但未连接，则先断开
  if (websocket.value) {
    websocket.value.disconnect()
  }

  try {
    websocket.value = io(SOCKET_URL+"/asynmessage", {
      reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
      reconnectionDelay: SOCKET_RECONNECT_DELAY,
      timeout: 10000,
      reconnection: true,
      autoConnect: true,
      transports: ['websocket', 'polling']
    })

    websocket.value.on('connect', () => {
      console.log('Socket.IO连接成功')
      wsConnected.value = true
    })

    websocket.value.on('dataStream', (data) => {
      try {
        console.log('收到dataStream消息:', data)

        // 先将data解析为object
        let parsedData
        if (typeof data === 'string') {
          parsedData = JSON.parse(data)
        } else {
          parsedData = data
        }

        console.log('解析后的dataStream消息:', parsedData)

        // 如果数据包含task_id，更新对应的任务状态
        if (parsedData.task_id && parsedData.msg_content) {
          const msgContent = parsedData.msg_content

          // 查找对应的批次任务
          const batchTaskIndex = asyncTasks.value.findIndex(t => t.id === parsedData.task_id)

          if (batchTaskIndex !== -1) {
            //const batchTask = asyncTasks.value[batchTaskIndex]

            if (asyncTasks.value[batchTaskIndex].type === 'batch_image_upload') {
              // 更新批次任务的整体状态
              const updatedBatchTask = asyncTasks.value[batchTaskIndex]
              if (msgContent.status) updatedBatchTask.status = msgContent.status
              if (msgContent.total !== undefined) updatedBatchTask.total_images = msgContent.total
              if (msgContent.finished !== undefined) updatedBatchTask.processed_images = msgContent.finished
              if (msgContent.finished_rate !== undefined) updatedBatchTask.progress = Math.round(msgContent.finished_rate * 100)

              // 如果有url，查找并更新对应的子任务
              if (msgContent.url) {
                // 在updatedBatchTask.sub_tasks中查找子任务
                const subTaskIndex = updatedBatchTask.sub_tasks.findIndex(st => st.image_name === msgContent.url)
                if (subTaskIndex !== -1) {
                  const updatedSubTask = updatedBatchTask.sub_tasks[subTaskIndex] 

                  // 更新子任务状态
                  if (msgContent.status) updatedSubTask.status = msgContent.status
                  // 如果子任务的状态是finished，则更新进度为100%
                  if (msgContent.status === 'finished') {
                    updatedSubTask.progress = 100
                  } else if (msgContent.finished_rate !== undefined) {
                    updatedSubTask.progress = 0
                  }
                  if (msgContent.image_row_id) updatedSubTask.row_id = msgContent.image_row_id
                  if (parsedData.time_stamp) updatedSubTask.updated_at = parsedData.time_stamp

                  // 更新updatedBatchTask.sub_tasks中的子任务
                  //updatedBatchTask.sub_tasks[subTaskIndex] = updatedSubTask

                 
                }
              }

              // 更新批次任务，触发响应式更新
              asyncTasks.value[batchTaskIndex] = updatedBatchTask
            }
          }
        }
        console.log('更新后的任务列表:', asyncTasks.value)
      } catch (error) {
        console.error('处理dataStream消息失败:', error)
      }
    })

    websocket.value.on('message', (data) => {
      try {
        console.log("websocket receive message:",data)
        handleWebSocketMessage(data)
      } catch (error) {
        console.error('处理Socket.IO消息失败:', error)
      }
    })

    websocket.value.on('disconnect', (reason) => {
      console.log('Socket.IO连接关闭，原因:', reason)
      wsConnected.value = false
    })

    websocket.value.on('error', (error) => {
      console.error('Socket.IO错误:', error)
      wsConnected.value = false
    })

    console.log('开始连接Socket.IO...')
  } catch (error) {
    console.error('创建Socket.IO连接失败:', error)
  }
}

// 处理WebSocket消息
const handleWebSocketMessage = (data) => {
  switch (data.type) {
    case 'tasks_list':
      asyncTasks.value = data.tasks || []
      break
    case 'task_update':
      updateTask(data.task)
      break
    case 'task_added':
      addTask(data.task)
      break
    case 'task_deleted':
      removeTask(data.task_id)
      break
    case 'tasks_cleared':
      asyncTasks.value = []
      break
    default:
      console.warn('未知的WebSocket消息类型:', data.type)
  }
}

// 更新任务
const updateTask = (task) => {
  const index = asyncTasks.value.findIndex(item => item.id === task.id)
  if (index !== -1) {
    asyncTasks.value[index] = task
  }
}

// 添加任务
const addTask = (task) => {
  const exists = asyncTasks.value.some(item => item.id === task.id)
  if (!exists) {
    asyncTasks.value.unshift(task)
  }
}

// 移除任务
const removeTask = (taskId) => {
  asyncTasks.value = asyncTasks.value.filter(item => item.id !== taskId)
}

// 获取人物详情
const fetchPersonDetail = async () => {
  const doubanId = route.params.id
  const searchText = route.query.search_text || ''

  if (!doubanId) {
    ElMessage.error('缺少人物ID')
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await post('/api/video/douban/video-info', {
      path: `https://movie.douban.com/celebrity/${doubanId}/`,
      info_type:1
     
    })

    const data = response

    if (data && data.status === 1 && data.data) {
      personDetail.value = data.data
    } else {
      throw new Error('获取人物详情失败')
    }
  } catch (err) {
    console.error('获取人物详情出错:', err)
    error.value = err.message || '获取人物详情失败，请稍后重试'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 滚动到人物简介卡片
const scrollToSummary = () => {
  const summaryCard = document.querySelector('.summary-card')
  if (summaryCard) {
    summaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 滚动到豆瓣图片卡片
const scrollToDoubanImages = () => {
  const doubanCard = document.querySelector('.douban-images-card')
  if (doubanCard) {
    doubanCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}





// 获取IMDb内容
const fetchImdbContent = async (imdbId) => {
  if (!imdbId) {
    console.log('没有IMDb ID，跳过获取IMDb内容')
    return
  }

  loadingImdb.value = true
  imdbImages.value = []

  try {
    const response = await post('/api/video/imdb/name-images-page', {
      imdb_id: imdbId,
      page_start: '',
      cursor_forward:0
    })

    if (response && response.status === 1 && response.data) {
      console.log(response.data)
      // 保存cursor值用于分页
      if (response.data.cursor) {
        imdbCursor.value = response.data.cursor
      }
      imdbHasNext.value = response.data.has_next
      // 保存total值
      if (response.data.total !== undefined) {
        imdbTotal.value = response.data.total
      }
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

// 格式化时间
const formatTime = (date) => {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return date

  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    pending: 'info',
    running: 'warning',
    finished: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    pending: '等待中',
    running: '上传中',
    finished: '上传完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return texts[status] || '未知'
}

// 获取IMDb缩略图URL
const getImdbThumbnailUrl = (imageUrl) => {
  if (!imageUrl) return ''
  // IMDb的图片URL格式: https://m.media-amazon.com/images/M/xxx._V1_.jpg
  // 将其中的 _V1_ 替换为 _V1_UX300_ 来获取300px宽的缩略图
  return imageUrl.replace(/_V1_\./, '_V1_UX300_.')
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

// 显示豆瓣图片预览
const showDoubanImagePreview = (index) => {
  // 设置初始索引
  doubanInitialIndex.value = index
  // 显示豆瓣图片查看器
  showDoubanImageViewer.value = true
}

// 上传选中的图片
const uploadSelectedImages = async () => {
  if (selectedImdbImages.value.size === 0) {
    ElMessage.warning('请先选择要上传的图片')
    return
  }

  // 获取IMDb ID和豆瓣ID
  const imdbId = personDetail.value?.BaseInfo?.IMDbID
  const doubanId = route.params.id

  if (!imdbId) {
    ElMessage.error('缺少IMDb ID')
    return
  }

  uploadProgress.value = 0

  try {
    const selectedUrls = Array.from(selectedImdbImages.value)

    // 构造图片数据数组
    const imagesData = selectedUrls.map(url => {
      const image = imdbImages.value.find(img => img.node.url === url)
      return {
        imdb_id: imdbId,
        douban_id: doubanId,
        image_name: url,
        image_text: image?.node?.caption?.plainText || "",
        image_comment: image?.node?.caption?.plainText || ""
      }
    })

    // 构造请求数据
    const requestData = {
      imdb_id: imdbId,
      load_type: 1,
      images: imagesData
    }

    // 发送异步上传任务请求
    const response = await post('/api/video/imdb/asyn-load-images', requestData)

     // 初始化WebSocket连接以接收任务状态更新
      initWebSocket()
      
      // 如果返回数据中包含task_id，则加入对应的房间
      if (response.data && response.data.task_id) {
        // 等待WebSocket连接建立后再加入房间
        const joinRoom = () => {
          if (wsConnected.value) {
            websocket.value.emit('join-room', JSON.stringify({ RoomId: response.data.task_id }))
            console.log(`已加入任务房间: ${response.data.task_id}`)

            // 创建批次任务（父任务）
            const batchTask = {
              id: response.data.task_id,
              status: 'pending',
              type: 'batch_image_upload',
              imdb_id: imdbId,
              douban_id: doubanId,
              total_images: imagesData.length,
              processed_images: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              sub_tasks: [] // 存储子任务ID
            }

           

            // 为每个图片创建子任务
            imagesData.forEach((imageData, index) => {
              //const subTaskId = `${response.data.task_id}_sub_${index}`
              const subTask = {
                id: imageData.image_name, // 使用图片URL作为子任务ID
                parent_id: response.data.task_id, // 关联父任务ID
                status: 'pending',
                type: 'image_upload',
                imdb_id: imdbId,
                douban_id: doubanId,
                image_name: imageData.image_name,
                image_text: imageData.image_text,
                image_comment: imageData.image_comment,
                progress: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }

              // 添加子任务到任务列表
              //addTask(subTask)
              //console.log(`已添加子任务到列表 [${index + 1}/${imagesData.length}]:`, subTask)

              // 将子任务ID添加到父任务的sub_tasks数组中
              batchTask.sub_tasks.push(subTask)
            })
            // 添加批次任务到任务列表
            addTask(batchTask)
            console.log('已添加批次任务到列表:', batchTask)
            // 更新批次任务的sub_tasks
            //updateTask(batchTask)
          } else {
            // 如果连接未建立，延迟重试
            setTimeout(joinRoom, 500)
          }
        }
        joinRoom()
      } else {
      ElMessage.error('上传任务提交失败')
    }

       // 清除所有图片的选择状态
    selectedImdbImages.value.clear()
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

// 加载更多IMDb图片
const loadMoreImdbImages = async () => {
  if (!personDetail.value?.BaseInfo?.IMDbID) {
    console.log('没有IMDb ID，无法加载更多图片')
    return
  }

  if (!imdbHasNext.value) {
    console.log('没有更多图片可以加载')
    ElMessage.warning('没有更多剧照了')
    return
  }

  loadingMoreImdb.value = true

  try {
    const response = await post('/api/video/imdb/name-images-page', {
      imdb_id: personDetail.value.BaseInfo.IMDbID,
      page_start: imdbCursor.value,
      cursor_forward:0
    })

    if (response && response.status === 1 && response.data) {
      // 更新cursor值
      if (response.data.cursor) {
        imdbCursor.value = response.data.cursor
      } else {
        imdbCursor.value = ''
      }
      imdbHasNext.value = response.data.has_next
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

// 加载更多豆瓣图片
const  loadMoreDoubanImages = async (direction = 'left', pid = '') => {
  // console.log('加载更多豆瓣图片响应:', direction, 'pid:', pid)
  // const doubanId = route.params.id
  // if (!doubanId) {
  //   ElMessage.error('缺少人物ID')
  //   return false
  // }

  // 检查 personDetail.value 是否存在
  if (!personDetail.value) {
    ElMessage.error('人物详情未加载')
    return false
  }

  // // 如果是向右导航，获取当前显示的豆瓣图片中最右一张的PhotoID
  // if (direction === 'right' && !pid && personDetail.value?.Picture?.Pictures?.length > 0) {
  //   pid = personDetail.value.Picture.Pictures[personDetail.value.Picture.Pictures.length - 1].PhotoID
  // }
  // pid="2379353869"

  //console.log('加载更多豆瓣图片响应:', direction, 'pid:', pid)
  try {
    // 构建API URL
    //let apiUrl = `/api/video/douban/image-more/${pid}/${direction}`
    // if (pid) {
    //   apiUrl += `/${pid}`
    // }
    //
    const response = await get(`/api/video/douban/image-more/${pid}/${direction}`)
    // 将 JSON 字符串转换为对象
    let responseData = response.data
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData)
      } catch (e) {
        //console.error('解析响应数据失败:', e)
        ElMessage.error('响应数据格式错误')
        return false
      }
    }
  
    if (response && response.status === 1 && responseData && responseData.photos) {
      // 如果返回的是图片数组，则添加到现有图片列表中
      if (Array.isArray(responseData.photos) && responseData.photos.length > 0) {
        if (!personDetail.value.Picture) {
          personDetail.value.Picture = { Pictures: [] }
        }
        const newPictures = responseData.photos
        .filter(photo => photo.icon !== undefined)
        .map(photo => (
          {
          PhotoURL: photo.path,
          PhotoID: photo.id,
          ImageURL: photo.icon.replace(/\/albumicon\//, '/photo/')
          }
        ))

        // 获取现有图片的PhotoID集合
const existingPhotoIds = new Set(personDetail.value.Picture.Pictures.map(p => p.PhotoID))

// 过滤掉重复的图片
const filteredNewPictures = newPictures.filter(photo => !existingPhotoIds.has(photo.PhotoID))

  //console.log('加载更多豆瓣图片响应:', filteredNewPictures)
        if(filteredNewPictures&&filteredNewPictures.length>0){

        // 将新图片添加到现有图片列表中
        if (direction === 'left') {
        　personDetail.value.Picture.Pictures = [...filteredNewPictures, ...personDetail.value.Picture.Pictures]
        } else {
          personDetail.value.Picture.Pictures = [...personDetail.value.Picture.Pictures, ...filteredNewPictures]
        }

        ElMessage.success(`已加载 ${filteredNewPictures.length} 张新图片`)
        return true
      }else{
        //ElMessage.success(`已加载 ${filteredNewPictures.length} 张新图片`)
        return false
      }
      } else {
        ElMessage.info('没有更多图片了')
        return false
      }
    } else {
      ElMessage.error('加载图片失败')
      return false
    }
  } catch (err) {
    console.error('加载更多豆瓣图片出错:', err)
    ElMessage.error('加载图片失败，请稍后重试')
    return false
  }
}

// 关闭Socket.IO连接
const closeWebSocket = () => {
  if (websocket.value) {
    websocket.value.disconnect()
    websocket.value = null
  }
  wsConnected.value = false
}

// 组件挂载时获取人物详情
onMounted(() => {
  fetchPersonDetail()
  // 初始化WebSocket连接
  initWebSocket()

  nextTick(() => {
loadMoreDoubanImages("right")
    
    
  })
  
})

// 组件卸载时关闭WebSocket连接
onUnmounted(() => {
  closeWebSocket()
  
})
</script>

<template>
  <div class="person-container">
    <Layout>
      <div class="person-content">
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
            <Icons.Loading />
          </el-icon>
          <p>加载中...</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-container">
          <el-icon :size="40" color="#f56c6c">
            <Icons.Warning />
          </el-icon>
          <p>{{ error }}</p>
        </div>

        <!-- 人物详情 -->
        <div v-else-if="personDetail" class="person-detail">
          <!-- 基本信息卡片 -->
          <el-card class="info-card" shadow="hover">
            <div class="person-header">
              <!-- 人物头像 -->
              <div class="person-avatar">
                <img
                  :src="getImageUrl(personDetail.BaseInfo?.AvatarURL, 0, 'avatar')"
                  :alt="personDetail.BaseInfo?.FullName || personDetail.BaseInfo?.ChineseName"
                  class="avatar-image"
                  @error="(e) => handleDoubanImageError(e, 0, 'avatar')"
                />
              </div>

              <!-- 人物信息 -->
              <div class="person-info">
                <h1 class="person-name">
                  {{ personDetail.BaseInfo?.FullName || personDetail.BaseInfo?.ChineseName }}
                </h1>
                <div v-if="personDetail.RawProps" class="info-rows">
                  <div v-for="(value, key) in personDetail.RawProps" :key="key" class="info-row">
                    <span class="info-label">{{ key }}</span>
                    <span class="info-value">{{ value }}</span>
                  </div>
                  <!-- IMDb图片按钮 -->
                  <div v-if="personDetail.BaseInfo?.IMDbID" class="info-row">
                    <span class="info-label">IMDb：</span>
                    <span class="info-value">{{ personDetail.BaseInfo.IMDbID }}</span>
                    <el-button
                      type="primary"
                      size="small"
                      :loading="loadingImdb"
                      @click="fetchImdbContent(personDetail.BaseInfo.IMDbID)"
                      class="fetch-imdb-btn"
                    >
                      {{ imdbImages.length > 0 ? '刷新IMDb照片' : '获取IMDb照片' }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 人物简介卡片 -->
          <el-card class="summary-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="section-title">人物简介</span>
              </div>
            </template>
            <div class="summary-content" v-html="personDetail.BaseInfo?.Summary || personDetail.Summary || '暂无简介'">
            </div>
          </el-card>

          <!-- 豆瓣图片卡片 -->
          <el-card v-if="personDetail.Picture?.Pictures && personDetail.Picture.Pictures.length > 0" class="douban-images-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="section-title">豆瓣图片 ({{ personDetail.Picture.Pictures.length }})</span>
              </div>
            </template>
            <div class="douban-images-list">
              <div
                v-for="(image, index) in personDetail.Picture.Pictures"
                :key="index"
                class="douban-image-item"
              >
                <el-image
                  :src="getImageUrl(image.ImageURL, index, 'douban')"
                  fit="cover"
                  
                  :initial-index="index"
                  class="douban-image"
                  @error="(e) => handleDoubanImageError(e, index, 'douban')"
                  @dblclick="showDoubanImagePreview(index)"
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon :size="30"><component :is="Icons.Picture" /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
            </div>
            <!-- 豆瓣图片预览组件 -->
            <el-image-viewer
              v-if="showDoubanImageViewer"
              :url-list="personDetail.Picture.Pictures.map(img => getImageUrl(img.ImageURL, personDetail.Picture.Pictures.indexOf(img), 'douban'))"
              :initial-index="doubanInitialIndex"
              @close="showDoubanImageViewer = false"
            />
            <!-- 左右导航条 -->
            <div class="douban-nav-buttons" v-if="showDoubanNav">
              <el-button
                class="nav-button left-button"
                :icon="Icons.ArrowLeft"
                circle
              
                @click="scrollScreenshots(-1)"
              />
              <el-button
                class="nav-button right-button"
                :icon="Icons.ArrowRight"
                circle
               
                @click="scrollScreenshots(1)"
              />
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
            <div v-if="imdbHasNext" class="load-more-container">
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
                  @click="clearAsyncTasks"
                  :disabled="asyncTasks.length === 0"
                >
                  清空任务
                </el-button>
              </div>
            </template>
            <div v-if="asyncTasks.length === 0" class="empty-tasks">
              暂无上传任务
            </div>
            <div v-else class="upload-tasks-list">
              <div v-for="(task, index) in asyncTasks" :key="index" class="upload-task-item">

                <!-- 批次任务 -->
                <div v-if="task.type === 'batch_image_upload'" class="batch-task">
                  <div class="batch-task-header">
                    <div class="batch-task-info">
                      <div class="batch-task-header-row">
                        <div class="batch-task-id">批次: {{ task.id }}</div>
                        <div class="batch-task-status">
                          <el-tag :type="getStatusType(task.status)">{{ getStatusText(task.status) }}</el-tag>
                          <span class="batch-task-count">{{ task.processed_images }}/{{ task.total_images }}</span>
                        </div>
                      </div>
                      <div class="batch-task-progress-row">
                        <el-progress
                          :percentage="task.total_images > 0 ? Math.round((task.processed_images / task.total_images) * 100) : 0"
                          :status="task.status === 'failed' ? 'exception' : (task.status === 'success' ? 'success' : '')"
                          :color="task.status !== 'failed' ? '#67C23A' : '#F56C6C'"
                          class="batch-task-progress"
                        />
                        <el-button
                          type="primary"
                          size="small"
                          style="margin-right: 10px;"
                          @click="toggleSubTasks(task.id)"
                        >
                          {{ expandedTasks.includes(task.id) ? '隐藏' : '展开' }}
                        </el-button>
                      </div>
                    </div>
                  </div>

                  <!-- 子任务列表 -->
                  <div v-if="expandedTasks.includes(task.id)" class="sub-tasks-list">
                    <div
                      v-for="(subTask, subIndex) in task.sub_tasks"
                      :key="subIndex"
                      class="sub-task-item"
                    >
                      <div class="sub-task-content">
                        <div class="sub-task-image-preview">
                          <img
                            :src="getImdbThumbnailUrl(subTask?.image_name)"
                            alt="上传图片"
                            class="preview-image"
                          />
                        </div>
                        <div class="sub-task-info">
                          <div class="sub-task-name">
                            {{ subTask?.image_name || '未知图片' }}
                          </div>
                          <div class="sub-task-text">
                            {{ subTask?.image_text || '' }}
                          </div>
                          <div class="sub-task-status">
                            <el-tag :type="getStatusType(subTask?.status)">
                              {{ getStatusText(subTask?.status) }}
                            </el-tag>
                            <span v-if="subTask?.error" class="sub-task-error">
                              {{ subTask?.error }}
                            </span>
                            <div v-if="subTask?.status === 'finished'" class="sub-task-details">
                              <div class="sub-task-row-id">Row_ID: {{ subTask?.row_id }}</div>
                              <div class="sub-task-update-time">{{ formatTime(subTask?.updated_at) }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 单个图片任务（保留原有逻辑） -->
              </div>
            </div>
          </el-drawer>

          <!-- 代表作品卡片 -->
          <el-card v-if="personDetail.Works && personDetail.Works.length > 0" class="works-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="section-title">代表作品</span>
              </div>
            </template>
            <div class="works-list">
              <div
                v-for="work in personDetail.Works"
                :key="work.id"
                class="work-item"
              >
                <img
                  :src="getImageUrl(work.cover_url, index, 'works')"
                  :alt="work.title"
                  class="work-cover"
                  @error="(e) => handleDoubanImageError(e, index, 'works')"
                />
                <div class="work-info">
                  <div class="work-title">{{ work.title }}</div>
                  <div class="work-role">{{ work.role }}</div>
                  <div v-if="work.rating" class="work-rating">
                    <span class="rating-value">{{ work.rating }}</span>
                  </div>
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
.person-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.person-content {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
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
  padding: 60px 20px;
  color: #909399;
}

.person-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card {
  margin-bottom: 24px;
}

.person-header {
  display: flex;
  gap: 24px;
}

.person-avatar {
  flex-shrink: 0;
}

.avatar-image {
  width: 200px;
  height: 280px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.person-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.person-name {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
}

.info-label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.info-value {
  color: #303133;
  flex: 1;
}

.summary-card {
  margin-bottom: 24px;
  position: relative;
}

.works-card,
.imdb-images-card {
  margin-bottom: 24px;
}

.douban-images-card {
  margin-bottom: 24px;
  position: relative;
}

.screenshots-container {
  position: relative;
  width: 100%;
}

.douban-images-list {
  display: flex;
  gap: 10px;
  overflow-x: hidden;
  scroll-behavior: smooth;
  padding: 10px 0;
  scrollbar-width: none;
}

.douban-images-list::-webkit-scrollbar {
  display: none;
}

.douban-image-item {
  flex: 0 0 calc(20% - 8px);
  aspect-ratio: 2/3;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.douban-image-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.douban-image {
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selection-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selected-count {
  margin-right: 8px;
  font-size: 14px;
  color: #606266;
}

.imdb-images-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
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

.image-dimensions {
  font-size: 16px;
  color: #fff;
  text-align: center;
  padding: 4px 0;
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
  margin-top: 16px;
}

.fetch-imdb-btn {
  margin-left: 8px;
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

}

.upload-task-item {
  margin-bottom: 20px;
  padding: 0;
  border: 1px solid #e1f3d8;
  border-radius: 8px;
  background-color: #f0f9f4;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.1);
}

.upload-task-item:hover {
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.1);
}

/* 批次任务样式 */
.batch-task {
  margin-top: 10px;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  gap: 15px;
  flex-direction: column;
}

.batch-task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.batch-task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-task-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-task-id {
  font-weight: 600;
  color: #303133;
  font-size: 16px;
  margin-bottom: 10px;
}

.batch-task-progress {
  width: 100%;
  margin-bottom: 10px;
  margin-top: 10px;
  flex: 1;
}

.batch-task-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.batch-task-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.batch-task-count {
  color: #606266;
  font-size: 14px;
}

/* 子任务列表样式 */
.sub-tasks-list {

}

.sub-task-item {
  margin-bottom: 15px;
  padding: 5px;
  border: 2px solid #7ec759;
  border-radius: 8px;
  background-color: #dff3e3;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.15);
  transition: all 0.3s ease;
}

.sub-task-item:hover {
  box-shadow: 0 4px 16px rgba(103, 194, 58, 0.25);
  transform: translateY(-2px);
  border-color: #85ce61;
}

.sub-task-content {
  display: flex;
  gap: 15px;
}

.sub-task-image-preview {
  width: 100px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
}

.sub-task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.sub-task-name {
  font-weight: 500;
  color: #67C23A;
  font-size: 16px;
  margin-bottom: 10px;
  margin-top: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
  display: block;
  width: 100%;
}

.sub-task-text {
  color: #606266;
  font-size: 14px;
  margin-bottom: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  width: 100%;
}

.sub-task-status {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sub-task-error {
  color: #f56c6c;
  font-size: 14px;
  margin-top: 0px;
  color: #f56c6c;
  font-weight: 500;
  font-size: 14px;
  padding: 6px 10px;
  background-color: #fef0f0;
  border-radius: 4px;
  word-break: break-all;
  text-align: right;
  margin-left: auto;
}

.sub-task-details {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 8px;
}

.sub-task-row-id {
  color: #67C23A;
  font-weight: 500;
  font-size: 14px;
  margin-right: 15px;
}

.sub-task-update-time {
  color: #909399;
  font-size: 12px;
  margin-right: 15px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.summary-content {
  line-height: 1.8;
  color: #606266;
  padding: 8px 0;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  overflow: visible;
}

.works-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.work-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s;
}

.work-item:hover {
  transform: translateY(-4px);
}

.work-cover {
  width: 100%;
  height: 240px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.work-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.work-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-role {
  font-size: 13px;
  color: #909399;
}

.work-rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rating-value {
  font-size: 14px;
  font-weight: 600;
  color: #ff9900;
}
.douban-nav-buttons {
  position: absolute;
  top: 60%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  pointer-events: none;
  box-sizing: border-box;
}

.nav-button {
  pointer-events: auto;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
