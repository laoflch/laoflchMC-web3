<script setup>
import { ref, nextTick, computed } from 'vue'
import { Plus, Loading } from '@element-plus/icons-vue'
import { createMovie, uploadImage } from '@/services/movies'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  imgBaseUrl: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const addFormRef = ref(null)
const submitting = ref(false)
const screenshotFileList = ref([])
const posterLoading = ref(false)
const screenshotLoading = ref(false)

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

const handlePosterChange = async (file) => {
  if (!file?.raw) return
  posterLoading.value = true
  try {
    const posterRes = await uploadImage(file.raw, 'movie_posters')
    addForm.value.image = posterRes.data
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
    const screenshotRes = await uploadImage(file.raw, 'movie_image')
    const screenshotId = screenshotRes.data

    // 将上传成功的图片ID添加到images数组中
    let images = []
    try {
      images = JSON.parse(addForm.value.images)
    } catch (e) {
      images = []
    }
    images.push(screenshotId)
    addForm.value.images = JSON.stringify(images)

    // 直接修改数组而不是创建新数组，减少响应式更新
    const index = screenshotFileList.value.findIndex((f) => f.raw === file.raw)
    if (index !== -1) {
      // 修改现有元素
      screenshotFileList.value[index] = { uid: screenshotId, name: screenshotId, status: 'success', url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${screenshotId}` }
    } else {
      // 添加新元素
      screenshotFileList.value.push({ uid: screenshotId, name: screenshotId, status: 'success', url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${screenshotId}` })
    }

    ElMessage.success('剧照上传成功')
  } catch (err) {
    ElMessage.error(`剧照上传失败：${err.message || err}`)
  } finally {
    screenshotLoading.value = false
  }
}

const removeScreenshot = () => {
  // el-upload 会自动从 file-list 移除，此处同步更新 addForm.images
  nextTick(() => {
    try {
      const ids = screenshotFileList.value.map((f) => f.uid).filter(Boolean)
      addForm.value.images = JSON.stringify(ids)
    } catch {
      // ignore
    }
  })
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
        emit('success')
        closeDialog()
      } catch (err) {
        ElMessage.error(`添加电影失败：${err.message || err}`)
      } finally {
        submitting.value = false
      }
    }
  })
}

const closeDialog = () => {
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
  // 使用 splice 一次性清空数组，只触发一次响应式更新
  screenshotFileList.value.splice(0, screenshotFileList.value.length)
  // 清除验证状态
  if (addFormRef.value) {
    addFormRef.value.clearValidate()
  }
  emit('update:modelValue', false)
}

// 监听对话框关闭事件
const handleDialogClose = () => {
  closeDialog()
}

const posterUrl = computed(() => {
  const img = addForm.value.image
  return img ? `${props.imgBaseUrl}/api/image/thumbnail/movie_posters/${img}` : ''
})
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="新增电影"
    width="72%"
    class="edit-movie-dialog"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleDialogClose"
  >
    <el-form
      ref="addFormRef"
      :model="addForm"
      :rules="addFormRules"
      label-width="90px"
    >
      <div class="form-sections">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">
            <span>基本信息</span>
          </div>
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="中文名" prop="name_ch">
                <el-input v-model="addForm.name_ch" placeholder="请输入中文名" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="英文名" prop="name_en">
                <el-input v-model="addForm.name_en" placeholder="请输入英文名" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="年份" prop="year">
                <el-input v-model="addForm.year" placeholder="如 2024" clearable maxlength="4" show-word-limit />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="IMDB ID" prop="imdb_id">
                <el-input v-model="addForm.imdb_id" placeholder="如 tt1234567" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="豆瓣 ID">
                <el-input v-model="addForm.douban_id" placeholder="请输入豆瓣 ID" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="评分">
                <el-input v-model="addForm.rating" placeholder="如 8.5" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="导演">
                <el-input v-model="addForm.director" placeholder="请输入导演" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="主演">
                <el-input v-model="addForm.actors" placeholder="请输入主演" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="类型">
                <el-input v-model="addForm.genre" placeholder="如 剧情/动作" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="国家/地区">
                <el-input v-model="addForm.country" placeholder="如 美国" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="语言">
                <el-input v-model="addForm.language" placeholder="如 英语" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="时长">
                <el-input v-model="addForm.duration" placeholder="如 120 分钟" clearable />
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
              v-model="addForm.brief_introduction"
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
                  <img v-else-if="addForm.image" :src="posterUrl" class="poster-preview" alt="海报" />
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
                  <el-upload
                    v-model:file-list="screenshotFileList"
                    list-type="picture-card"
                    class="custom-screenshot-upload"
                    :on-change="(file) => handleScreenshotChange(file)"
                    :on-remove="removeScreenshot"
                    :on-preview="() => {}"
                    :auto-upload="false"
                    accept="image/*"
                    multiple
                    :disabled="submitting"
                  >
                    <el-icon v-if="!screenshotLoading"><Plus /></el-icon>
                    <div v-else class="upload-loading">
                      <el-icon class="is-loading"><Loading /></el-icon>
                    </div>
                  </el-upload>
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
        <el-button type="primary" :loading="submitting" @click="handleAddMovie">
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

.screenshot-col {
  width: calc(100% ) !important;
  flex: 0 0 calc(100% ) !important;
  max-width: calc(100% ) !important;
  box-sizing: border-box !important;
  padding-right: 15px !important;
  padding-left: 15px !important;
}

.screenshot-upload-wrap {
  width: 100%;
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

.poster-empty,
.poster-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #8c939d;
}

.poster-empty span,
.poster-loading span {
  margin-top: 8px;
  font-size: 14px;
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

/* 禁用图片预览功能 */
.custom-screenshot-upload .el-upload-list__item-preview {
  display: none !important;
}

/* 禁用图片点击事件 */
.custom-screenshot-upload .el-upload-list__item {
  pointer-events: none !important;
}

/* 允许删除按钮点击 */
.custom-screenshot-upload .el-upload-list__item-delete {
  pointer-events: auto !important;
}

/* 截图列表 */
.custom-screenshot-upload .el-upload-list--picture-card {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important;
  gap: 10px !important;
  margin: 0 !important;
  width: 100% !important;
  padding: 0 !important;
}

/* 截图项 */
.custom-screenshot-upload .el-upload-list__item {
  width: 100% !important;
  height: auto !important;
  aspect-ratio: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 6px !important;
  overflow: hidden !important;
}

/* 截图项内的图片 */
.custom-screenshot-upload .el-upload-list__item-thumbnail {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
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
  width: 100% !important;
  height: auto !important;
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
  }
}

@media (min-width: 1200px) {
  .custom-screenshot-upload .el-upload-list--picture-card {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
  }
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
</style>
