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
const submitting = ref(false)
const screenshotFileList = ref([])
const posterLoading = ref(false)
const screenshotLoading = ref(false)

const defaultForm = () => ({
  id: '',
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
      form[fieldName] = value ?? ''
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
            newItems.push({
              uid: imgId,
              name: imgId,
              status: 'success',
              url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${imgId}`
            })
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
    // 直接修改数组而不是创建新数组，减少响应式更新
    const index = screenshotFileList.value.findIndex((f) => f.raw === file.raw)
    if (index !== -1) {
      // 修改现有元素
      screenshotFileList.value[index] = { uid: id, name: id, status: 'success', url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${id}` }
    } else {
      // 添加新元素
      screenshotFileList.value.push({ uid: id, name: id, status: 'success', url: `${props.imgBaseUrl}/api/image/thumbnail/movie_image/${id}` })
    }
    ElMessage.success('剧照上传成功')
  } catch (err) {
    ElMessage.error(`剧照上传失败：${err.message || err}`)
  } finally {
    screenshotLoading.value = false
  }
}

const removeScreenshot = () => {
  // el-upload 会自动从 file-list 移除，此处同步更新 editForm.images
  nextTick(() => {
    try {
      const ids = screenshotFileList.value.map((f) => f.uid).filter(Boolean)
      editForm.value.images = JSON.stringify(ids)
    } catch {
      // ignore
    }
  })
}

const handleEditMovie = async () => {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const { posterFile, screenshotFiles, ...movieData } = editForm.value
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
                <el-input v-model="editForm.year" placeholder="如 2024" clearable maxlength="4" show-word-limit />
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
                <el-input v-model="editForm.rating" placeholder="如 8.5" clearable />
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
                <el-input v-model="editForm.duration" placeholder="如 120 分钟" clearable />
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
                  <el-upload
                    v-model:file-list="screenshotFileList"
                    list-type="picture-card"
                    class="custom-screenshot-upload"
                    :on-change="(file) => handleScreenshotChange(file)"
                    :on-remove="removeScreenshot"
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
</style>

<style>
/* 非 scoped，确保在 dialog teleport 后仍生效 */
/* 截图上传容器 */
.custom-screenshot-upload {
  width: 100% !important;
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

  .screenshot-col {
    width: calc(100% ) !important;
    flex: 0 0 calc(100% ) !important;
    max-width: calc(100% ) !important;
    box-sizing: border-box !important;
    padding-right: 15px !important;
    padding-left: 15px !important;
  }
</style>
