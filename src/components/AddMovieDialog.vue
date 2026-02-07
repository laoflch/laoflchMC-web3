<script setup>
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
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
    const screenshotId = screenshotRes.data

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
  screenshotFileList.value = []
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
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="新增电影"
    width="70%"
    :close-on-click-modal="false"
    @close="handleDialogClose"
  >
    <el-form
      ref="addFormRef"
      :model="addForm"
      :rules="addFormRules"
      label-width="90px"
    >
      <div class="form-container">
        <div class="form-left">
          <div class="form-column">
            <el-form-item label="中文名" prop="name_ch">
              <el-input v-model="addForm.name_ch" placeholder="请输入中文名" />
            </el-form-item>
            <el-form-item label="IMDB ID" prop="imdb_id">
              <el-input v-model="addForm.imdb_id" placeholder="请输入IMDB ID" />
            </el-form-item>
            <el-form-item label="年份" prop="year">
              <el-input v-model="addForm.year" placeholder="请输入年份" />
            </el-form-item>
            <el-form-item label="导演">
              <el-input v-model="addForm.director" placeholder="请输入导演" />
            </el-form-item>
            <el-form-item label="类型">
              <el-input v-model="addForm.genre" placeholder="请输入类型" />
            </el-form-item>
            <el-form-item label="语言">
              <el-input v-model="addForm.language" placeholder="请输入语言" />
            </el-form-item>
          </div>
          <div class="form-column">
            <el-form-item label="英文名" prop="name_en">
              <el-input v-model="addForm.name_en" placeholder="请输入英文名" />
            </el-form-item>
            <el-form-item label="豆瓣ID">
              <el-input v-model="addForm.douban_id" placeholder="请输入豆瓣ID" />
            </el-form-item>
            <el-form-item label="评分">
              <el-input v-model="addForm.rating" placeholder="请输入评分" />
            </el-form-item>
            <el-form-item label="主演">
              <el-input v-model="addForm.actors" placeholder="请输入主演" />
            </el-form-item>
            <el-form-item label="国家/地区">
              <el-input v-model="addForm.country" placeholder="请输入国家/地区" />
            </el-form-item>
            <el-form-item label="时长">
              <el-input v-model="addForm.duration" placeholder="请输入时长" />
            </el-form-item>
          </div>
          <div class="form-column">
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
          </div>
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
:deep(.el-dialog) {
  min-width: 800px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

.form-container {
  display: flex;
  gap: 20px;
  min-height: 500px;
}

.form-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.form-left > .el-form-item {
  width: 100%;
}

.form-column {
  flex: 1;
  min-width: 0;
}

.form-column:last-child {
  margin-left: auto;
  flex: 1;
}

.form-right {
  width: 200px;
  flex-shrink: 0;
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
</style>
