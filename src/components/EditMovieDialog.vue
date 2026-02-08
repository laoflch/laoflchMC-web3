<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { Plus, Loading } from '@element-plus/icons-vue'
import { updateMovie, uploadImage } from '@/services/movies'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  movieData: {
    type: Object,
    default: () => ({})
  },
  colsIndex: {
    type: Object,
    default: () => ({})
  },
  imgBaseUrl: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const editFormRef = ref(null)
const uploadRef = ref(null)
const submitting = ref(false)
const screenshotFileList = ref([])
const posterLoading = ref(false)
const screenshotLoading = ref(false)
const screenshotUrl = ref('')
const urlInputDialogVisible = ref(false)

const defaultForm = () => ({
  row_key:'',
  //id: '',
  imdb_id: '',
  douban_id: '',
  name_ch: '',
  name_en: '',
  year: 1900,
  director: '',
  actors: '',
  genre: '',
  country: '',
  language: '',
  duration: 0,
  rating: 0.0,
  brief_introduction: '',
  image: '',
  images: '[]',
  posterFile: null,
  screenshotFiles: []
})

const editForm = ref(defaultForm())

const editFormRules = {
  imdb_id: [{ required: true, message: '请输入 IMDB ID', trigger: 'blur' }],
  name_ch: [{ required: true, message: '请输入中文名', trigger: 'blur' }],
  name_en: [{ required: true, message: '请输入英文名', trigger: 'blur' }],
  year: [{ required: true, message: '请输入年份', trigger: 'blur' }]
}

// 根据 cols_index 将 API 数据映射为表单字段
function mapMovieToForm(raw) {
  if (!raw || Object.keys(raw).length === 0) return defaultForm()
  const ci = props.colsIndex
  if (!ci || Object.keys(ci).length === 0) {
    return { ...defaultForm(), ...raw, images: raw.images || '[]', posterFile: null, screenshotFiles: [] }
  }
  const reverseMap = Object.entries(ci).reduce((acc, [name, key]) => {
    acc[key] = name
    return acc
  }, {})
  const form = { ...defaultForm() }
  for (const [key, value] of Object.entries(raw)) {
    const fieldName = reverseMap[key] ?? key
    if (fieldName in form && fieldName !== 'posterFile' && fieldName !== 'screenshotFiles') {
     
        form[fieldName] = value 
        
    } else if (fieldName === 'default') {
      form.row_key = value ?? ''
    }
      
  }
  form.images = (typeof form.images === 'string' ? form.images : JSON.stringify(form.images || [])) || '[]'
  form.posterFile = null
  form.screenshotFiles = []
  return form
}

watch(
  () => [props.movieData, props.colsIndex],
  () => {
    const data = props.movieData
    if (data && Object.keys(data).length > 0) {
      editForm.value = mapMovieToForm(data)
      try {
        const images = JSON.parse(editForm.value.images || '[]')
        // 批量更新：一次性创建并赋值新数组，只触发一次响应式更新
        const newItems = []
        if (Array.isArray(images)) {
          for (const imgId of images) {
            if(imgId && imgId.length > 0 &&imgId!==""){
            newItems.push({
              uid: imgId,
              name: imgId,
              status: 'success',
              url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${imgId}`
            })
          }
          }
        }
        screenshotFileList.value = newItems
      } catch {
        // 直接赋值为空数组，简洁高效
        screenshotFileList.value = []
      }
    }
  },
  { immediate: true, deep: true }
)

const handlePosterChange = async (file) => {
  if (!file?.raw) return
  posterLoading.value = true
  try {
    const res = await uploadImage(file.raw, 'movie_posters')
    editForm.value.image = res.data
    ElMessage.success('海报上传成功')
  } catch (err) {
    ElMessage.error(`海报上传失败：${err.message || err}`)
  } finally {
    posterLoading.value = false
  }
}

const handleScreenshotChange = async (file) => {
  if (!file?.raw) return
  screenshotLoading.value = true
  try {
    const res = await uploadImage(file.raw, 'movie_image')
    const id = res.data
    let images = []
    try {
      images = JSON.parse(editForm.value.images || '[]')
    } catch {
      images = []
    }
    images.push(id)
    editForm.value.images = JSON.stringify(images)

    // 更新截图列表
    screenshotFileList.value[screenshotFileList.value.length - 1]={
      uid: id,
      name: id,
      status: 'success',
      url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${id}`
    }
    
    
    
    
    //   screenshotFileList.value[index] = { uid: id, name: id, status: 'success', url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${id}` }
    // } else {
    //   // 添加新元素
    //   screenshotFileList.value.push({ uid: id, name: id, status: 'success', url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${id}` })
    // }

    //screenshotFileList.value[screenshotFileList.value.length - 1].status = 'success'
    ElMessage.success('剧照上传成功')
  } catch (err) {
    ElMessage.error(`剧照上传失败：${err.message || err}`)
  } finally {
    screenshotLoading.value = false
  }
}

const removeScreenshot = (item) => {
  // 从截图列表中移除
  const index = screenshotFileList.value.findIndex((f) => f.uid === item.uid)
  if (index !== -1) {
    screenshotFileList.value.splice(index, 1)
  }
  // 同步更新 editForm.images
  nextTick(() => {
    try {
      const ids = screenshotFileList.value.map((f) => f.uid).filter(Boolean)
      editForm.value.images = JSON.stringify(ids)
    } catch {
      // ignore
    }
  })
}

const addScreenshotByUrl = async () => {
  if (!screenshotUrl.value) {
    ElMessage.warning('请输入图片URL')
    return
  }
  
  screenshotLoading.value = true
  try {
    // 通过fetch获取图片
    const response = await fetch(screenshotUrl.value, {
      mode: 'cors',
      credentials: 'omit'
    })
    
    if (!response.ok) {
      throw new Error(`获取图片失败: ${response.statusText}`)
    }
    
    // 将响应转换为Blob
    const blob = await response.blob()
    
    // 创建File对象
    const file = new File([blob], `screenshot_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`, {
      type: blob.type
    })
    
    // 上传图片
    const res = await uploadImage(file, 'movie_image')
    const id = res.data
    
    // 更新images数组
    let images = []
    try {
      images = JSON.parse(editForm.value.images || '[]')
    } catch {
      images = []
    }
    images.push(id)
    editForm.value.images = JSON.stringify(images)
    
    // 更新截图列表
    screenshotFileList.value.push({
      uid: id,
      name: id,
      status: 'success',
      url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${id}`
    })
    
    // 清空URL输入框
    screenshotUrl.value = ''
    // 关闭对话框
    urlInputDialogVisible.value = false
    ElMessage.success('剧照添加成功')
  } catch (err) {
    console.error('添加剧照失败:', err)
    ElMessage.error(`添加剧照失败：${err.message || err}`)
  } finally {
    screenshotLoading.value = false
  }
}

const triggerFileInput = () => {
  // 触发文件选择
  if (uploadRef.value) {
    const uploadInput = uploadRef.value.$el.querySelector('input[type="file"]')
    if (uploadInput) {
      uploadInput.click()
    }
  }
}

const showUrlInput = () => {
  // 显示URL输入对话框
  urlInputDialogVisible.value = true
}

const handleEditMovie = async () => {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const { posterFile, screenshotFiles, ...movieData } = editForm.value
      console.log('handleEdit payload:',movieData)
      await updateMovie(movieData)
      ElMessage.success('编辑成功')
      emit('success')
      closeDialog()
    } catch (err) {
      ElMessage.error(`编辑失败：${err.message || err}`)
    } finally {
      submitting.value = false
    }
  })
}

const closeDialog = () => {
  editForm.value = defaultForm()
  
  async function ScreenshotFileListClean() {
     screenshotFileList.value=[];
  }

  ScreenshotFileListClean
 // editFormRef.value?.clearValidate()
  emit('update:modelValue', false)
  // 使用 splice 一次性清空数组，只触发一次响应式更新
  //screenshotFileList.value.splice(0, screenshotFileList.value.length)
}

const handleDialogClose = () => closeDialog()

const posterUrl = computed(() => {
  const img = editForm.value.image
  return img ? `${props.imgBaseUrl}/api/image/thumbnail/movie_posters/${img}` : ''
})

const getScreenshotUrl = (url) => {
  return url || `${props.imgBaseUrl}/api/image/thumbnail/movie_posters/64dfe4e8-a734-3e30-83eb-c241d6f5aa57`
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="编辑电影"
    width="72%"
    class="edit-movie-dialog"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleDialogClose"
  >
    <el-form ref="editFormRef" :model="editForm" :rules="editFormRules" label-width="96px">
      <div class="form-sections">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">
            <span>基本信息</span>
          </div>
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="中文名" prop="name_ch">
                <el-input v-model="editForm.name_ch" placeholder="请输入中文名" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="英文名" prop="name_en">
                <el-input v-model="editForm.name_en" placeholder="请输入英文名" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="年份" prop="year">
                <el-input type="number" v-model.number="editForm.year" placeholder="如 2024" clearable maxlength="4" show-word-limit />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="IMDB ID" prop="imdb_id">
                <el-input v-model="editForm.imdb_id" placeholder="如 tt1234567" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="豆瓣 ID">
                <el-input v-model="editForm.douban_id" placeholder="请输入豆瓣 ID" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="评分">
                <el-input type="number" v-model.number="editForm.rating" placeholder="如 8.5" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="导演">
                <el-input v-model="editForm.director" placeholder="请输入导演" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="主演">
                <el-input v-model="editForm.actors" placeholder="请输入主演" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="类型">
                <el-input v-model="editForm.genre" placeholder="如 剧情/动作" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="国家/地区">
                <el-input v-model="editForm.country" placeholder="如 美国" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="语言">
                <el-input v-model="editForm.language" placeholder="如 英语" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="时长">
                <el-input type="number" v-model.number="editForm.duration" placeholder="如 120 分钟" clearable />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 剧情简介 -->
        <div class="form-section">
          <div class="section-title">
            <span>剧情简介</span>
          </div>
          <el-form-item>
            <el-input
              v-model="editForm.brief_introduction"
              type="textarea"
              :rows="5"
              placeholder="请输入剧情简介"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>
        </div>

        <!-- 海报与剧照 -->
        <div class="form-section">
          <div class="section-title">
            <span>海报与剧照</span>
          </div>
          <el-row :gutter="24">
            <el-col :xs="24" :sm="24" :md="8" :lg="6">
              <el-form-item label="封面海报">
                <el-upload
                  class="poster-uploader"
                  :show-file-list="false"
                  :on-change="handlePosterChange"
                  :auto-upload="false"
                  accept="image/*"
                  :disabled="submitting"
                >
                  <div v-if="posterLoading" class="poster-loading">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span>上传中</span>
                  </div>
                  <img v-else-if="editForm.image" :src="posterUrl" class="poster-preview" alt="海报" />
                  <div v-else class="poster-empty">
                    <el-icon><Plus /></el-icon>
                    <span>点击上传</span>
                  </div>
                </el-upload>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="16" :lg="18" class="screenshot-col">
              <el-form-item label="电影剧照">
                <div class="screenshot-upload-wrap">
              
                  <div class="screenshot-grid">
                    <!-- 已上传的图片列表 -->
                    <div
                      v-for="item in screenshotFileList"
                      :key="item.uid"
                      class="screenshot-item"
                    >
                      <img :src="getScreenshotUrl(item.url)" class="screenshot-thumbnail" alt="截图" />
                      <div class="screenshot-actions">
                        <el-icon class="screenshot-delete" @click="removeScreenshot(item)">
                          <delete />
                        </el-icon>
                      </div>
                    </div>
                    <!-- 上传文件按钮 -->
                    <div class="upload-method-item" style="background-color: #d7ebff ;" @click="triggerFileInput">
                      <el-icon><Plus /></el-icon>
                      <span>上传文件</span>
                    </div>
                    <!-- URL添加按钮 -->
                    <div class="upload-method-item"  @click="showUrlInput">
                      <el-icon><Plus /></el-icon>
                      <span>URL添加</span>
                    </div>
                  </div>
            
                            <!-- 隐藏的el-upload组件，用于文件选择 -->
                  <el-upload
                    ref="uploadRef"
                    v-model:file-list="screenshotFileList"
                    :show-file-list="false"
                    :on-change="(file) => handleScreenshotChange(file)"
                    :auto-upload="false"
                    accept="image/*"
                    multiple
                    :disabled="submitting"
                    style="display: none;"
                  />   
                    
               
                  <el-dialog
                    v-model="urlInputDialogVisible"
                    title="通过URL添加图片"
                    width="500px"
                    :close-on-click-modal="false"
                  >
                    <el-input
                      v-model="screenshotUrl"
                      placeholder="请输入图片URL"
                      clearable
                      @keyup.enter="addScreenshotByUrl"
                    />
                    <template #footer>
                      <el-button @click="urlInputDialogVisible = false">取消</el-button>
                      <el-button type="primary" :loading="screenshotLoading" @click="addScreenshotByUrl">
                        添加
                      </el-button>
                    </template>
                  </el-dialog>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleEditMovie">
          {{ submitting ? '提交中...' : '确定' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.edit-movie-dialog :deep(.el-dialog) {
  min-width: 720px;
  max-width: 960px;
}

.edit-movie-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.form-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  background: #fafbfc;
  border-radius: 8px;
  padding: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eef5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.poster-uploader {
  width: 160px;
  height: 220px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-uploader:hover {
  border-color: #409eff;
}

.poster-empty,
.poster-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #8c939d;
  font-size: 13px;
  gap: 8px;
}

.poster-empty .el-icon,
.poster-loading .el-icon {
  font-size: 32px;
}

.poster-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* 剧照列表自适应平铺 */
.screenshot-upload-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* 截图网格布局 */
.screenshot-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
  gap: 10px !important;
  width: 100%;
}

/* 截图项和上传按钮的通用样式 */
.screenshot-item,
.upload-method-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  border: 1px dashed #d7dce6;
  background-color: #fafbfc;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer
}

/* 截图项特有样式 */
.screenshot-item {
  overflow: hidden;
  
}

/* 截图缩略图 */
.screenshot-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 截图操作区 */
.screenshot-actions {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
  background: rgba(0, 0, 0, 0.5);
}

.screenshot-item:hover .screenshot-actions {
  opacity: 1;
}

/* 删除按钮 */
.screenshot-delete {
  font-size: 20px;
  color: #fff;
  cursor: pointer;
}

/* 上传方式选择区域 */
/* .upload-method-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  cursor: pointer;
} */

.upload-method-item:hover {
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.05);
}

.upload-method-item span {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
}

/* 取消截图列表项的动画效果 */
.custom-screenshot-upload .el-upload-list__item {
  transition: none !important;
  animation: none !important;
}

/* 取消上传列表的过渡动画 */
.custom-screenshot-upload .el-upload-list {
  transition: none !important;
}

/* 取消图片缩放动画 */
.custom-screenshot-upload .el-upload-list__item-thumbnail {
  transition: none !important;
  animation: none !important;
}

/* 取消上传按钮的动画 */
.custom-screenshot-upload .el-upload--picture-card {
  transition: none !important;
  animation: none !important;
}
</style>

<style>
/* 非 scoped，确保在 dialog teleport 后仍生效 */
/* 截图上传容器 */
.custom-screenshot-upload {
  width: 100% !important;
}



/* 取消删除图片时的动画 */
.custom-screenshot-upload .el-upload-list__item {
  transition: none !important;
  animation: none !important;
}

.custom-screenshot-upload .el-upload-list__item:hover {
  transition: none !important;
}

/* 取消上传列表的过渡动画 */
.el-upload-list {
  transition: none !important;
}

/* 取消图片缩放动画 */
.el-upload-list__item-thumbnail {
  transition: none !important;
  animation: none !important;
}

/* 取消Vue transition组件的动画 */
.el-list-enter-active,
.el-list-leave-active {
  transition: none !important;
}

.el-list-enter-from,
.el-list-leave-to {
  opacity: 1 !important;
  transform: none !important;
}

/* 取消Element Plus的transition组件的动画 */
.el-zoom-in-center-enter-active,
.el-zoom-in-center-leave-active,
.el-zoom-in-top-enter-active,
.el-zoom-in-top-leave-active,
.el-zoom-in-bottom-enter-active,
.el-zoom-in-bottom-leave-active,
.el-zoom-in-left-enter-active,
.el-zoom-in-left-leave-active,
.el-zoom-in-right-enter-active,
.el-zoom-in-right-leave-active,
.el-fade-in-enter-active,
.el-fade-in-leave-active {
  transition: none !important;
}

.el-zoom-in-center-enter-from,
.el-zoom-in-center-leave-to,
.el-zoom-in-top-enter-from,
.el-zoom-in-top-leave-to,
.el-zoom-in-bottom-enter-from,
.el-zoom-in-bottom-leave-to,
.el-zoom-in-left-enter-from,
.el-zoom-in-left-leave-to,
.el-zoom-in-right-enter-from,
.el-zoom-in-right-leave-to,
.el-fade-in-enter-from,
.el-fade-in-leave-to {
  opacity: 1 !important;
  transform: none !important;
}

/* 截图列表 
.custom-screenshot-upload .el-upload-list--picture-card {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important;
  gap: 10px !important;
  margin: 0 !important;
  width: 100% !important;
  padding: 0 !important;
}

/* 隐藏默认的上传按钮 */
.custom-screenshot-upload .el-upload--picture-card {
  display: none !important;
}

/* 截图项 */
.custom-screenshot-upload .el-upload-list__item {
  /*width: 100% !important;
  height: auto !important;*/
  aspect-ratio: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 6px !important;
  overflow: hidden !important;
}

/* 截图项内的图片 */
.custom-screenshot-upload .el-upload-list__item-thumbnail {
  width: 100% ;
  height: 100% ;
  object-fit: cover ;
}

/* 隐藏预览图标，只保留删除图标 */
.custom-screenshot-upload .el-upload-list__item-actions {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  width: 100% !important;
  height: 100% !important;
  top: 0 !important;
  left: 0 !important;
  position: absolute !important;
}

/* 隐藏图片右上角的打勾标签 */
.custom-screenshot-upload .el-upload-list__item-status-label {
  display: none !important;
}

.custom-screenshot-upload .el-upload-list__item-preview {
  display: none !important;
}

/* 将删除图标位置调整到图片的正中央 */
.custom-screenshot-upload .el-upload-list__item-delete {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  z-index: 10 !important;
  font-size: 20px !important;
  color: #fff !important;
  background: rgba(0, 0, 0, 0.5) !important;
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

/* 上传按钮 */
.custom-screenshot-upload .el-upload--picture-card {
  /* width: 100% !important;
  height: auto !important; */
  aspect-ratio: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 6px !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .custom-screenshot-upload .el-upload-list--picture-card {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)) !important;
    gap: 8px !important;
    gap: 10px !important;
    margin: 0 !important;
    width: 100% !important;
    padding: 0 !important;
  }
}

@media (min-width: 1200px) {
  .custom-screenshot-upload .el-upload-list--picture-card {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
    gap: 10px !important;
    margin: 0 !important;
    width: 100% !important;
    padding: 0 !important;
  }
}

  .screenshot-col {
    width: calc(100% ) !important;
    flex: 0 0 calc(100% ) !important;
    max-width: calc(100% ) !important;
    box-sizing: border-box !important;
    padding-right: 15px !important;
    padding-left: 15px !important;
  }
</style>
