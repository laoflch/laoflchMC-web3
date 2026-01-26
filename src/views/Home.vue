
<script setup>
import { ref } from 'vue'
import Layout from '@/components/layouts/Layout.vue'

const userInfo = ref(null)
const tableData = ref([
  {
    date: '2023-05-02',
    name: '王小虎',
    address: '上海市普陀区金沙江路 1518 弄'
  },
  {
    date: '2023-05-04',
    name: '王小虎',
    address: '上海市普陀区金沙江路 1517 弄'
  },
  {
    date: '2023-05-01',
    name: '王小虎',
    address: '上海市普陀区金沙江路 1519 弄'
  },
  {
    date: '2023-05-03',
    name: '王小虎',
    address: '上海市普陀区金沙江路 1516 弄'
  }
])

const dialogVisible = ref(false)
const input = ref('')
const textarea = ref('')
const select = ref('')
const radio = ref(1)
const checkbox = ref(true)
const checkedCities = ref(['上海', '北京'])
const cities = ref(['上海', '北京', '广州', '深圳'])
const date = ref('')
const value = ref('')
const switchValue = ref(true)
const sliderValue = ref(50)

const handleSelect = (key, keyPath) => {
  console.log(key, keyPath)
}

const openDialog = () => {
  dialogVisible.value = true
}

const showNotification = () => {
  ElNotification({
    title: '通知',
    message: '这是一条通知消息',
    type: 'success',
  })
}

// header/navigation is handled by Layout component
</script>

<template>
  <div class="home-container">
    <Layout>
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>表单组件</span>
          </div>
        </template>

        <el-form label-width="120px">
          <el-form-item label="输入框">
            <el-input v-model="input" placeholder="请输入内容" />
          </el-form-item>

          <el-form-item label="文本域">
            <el-input
              v-model="textarea"
              :rows="2"
              type="textarea"
              placeholder="请输入内容"
            />
          </el-form-item>

          <el-form-item label="选择器">
            <el-select v-model="select" placeholder="请选择">
              <el-option label="选项1" value="1" />
              <el-option label="选项2" value="2" />
              <el-option label="选项3" value="3" />
            </el-select>
          </el-form-item>

          <el-form-item label="单选框">
            <el-radio v-model="radio" :label="1">选项1</el-radio>
            <el-radio v-model="radio" :label="2">选项2</el-radio>
          </el-form-item>

          <el-form-item label="多选框">
            <el-checkbox v-model="checkbox">选项1</el-checkbox>
            <el-checkbox-group v-model="checkedCities">
              <el-checkbox v-for="city in cities" :key="city" :label="city">
                {{ city }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="日期选择器">
            <el-date-picker
              v-model="date"
              type="date"
              placeholder="选择日期"
            />
          </el-form-item>

          <el-form-item label="时间选择器">
            <el-time-picker
              v-model="value"
              placeholder="选择时间"
            />
          </el-form-item>

          <el-form-item label="开关">
            <el-switch v-model="switchValue" />
          </el-form-item>

          <el-form-item label="滑块">
            <el-slider v-model="sliderValue" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="openDialog">打开对话框</el-button>
            <el-button type="success" @click="showNotification">显示通知</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>表格组件</span>
          </div>
        </template>

        <el-table :data="tableData" style="width: 100%">
          <el-table-column prop="date" label="日期" width="180" />
          <el-table-column prop="name" label="姓名" width="180" />
          <el-table-column prop="address" label="地址" />
        </el-table>
      </el-card>

      <el-dialog
        v-model="dialogVisible"
        title="提示"
        width="30%"
      >
        <span>这是一个对话框</span>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="dialogVisible = false">确定</el-button>
          </span>
        </template>
      </el-dialog>
    </Layout>
  </div>
</template>

<style scoped>
.home-container { min-height: 100vh }
.content-wrapper { max-width: 1200px; margin: 0 auto }
.box-card { margin-bottom: 20px }
.card-header { display:flex; justify-content:space-between; align-items:center }
</style>
