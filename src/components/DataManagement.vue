
<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as Icons from '@element-plus/icons-vue'
import io from 'socket.io-client'
import {
  getTables,
  getTableSchema,
  getTableData,
  insertData,
  updateData,
  deleteData,
  batchDeleteData,
  exportData,
  importData,
  alterTableSchema,
  createTable
} from '@/services/dataManagement'

// 当前选中的表
const currentTable = ref('')
// 表列表
const tables = ref([])
// 表数据
const tableData = ref([])
// 表结构
const tableSchema = ref([])
// 字段名到列索引的映射
const colsIndex = ref({})
// 加载状态
const loading = ref(false)
// 分页
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})
// 选中的行
const selectedRows = ref([])
// 过滤条件
const filters = ref({})
// 排序条件
const sort = ref({
  field: '',
  order: 'asc'
})
// 编辑对话框
const editDialogVisible = ref(false)
// 编辑表单数据
const editFormData = ref({})
// 是否为新增模式
const isAddMode = ref(false)
// 导入对话框
const importDialogVisible = ref(false)
// 导入文件
const importFile = ref(null)
// 修改表结构对话框
const alterSchemaDialogVisible = ref(false)
// 临时表结构数据
const tempTableSchema = ref([])
// 新建表对话框
const createTableDialogVisible = ref(false)
// 新建表表单数据
const createTableForm = ref({
  name: '',
  schema: []
})

// 异步任务相关
const taskDrawerVisible = ref(false)
const asyncTasks = ref([])
const websocket = ref(null)
const wsConnected = ref(false)

// 任务状态类型
const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed'
}

// Socket.IO连接配置
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:18081'
const SOCKET_RECONNECT_ATTEMPTS = 5 // 最大重连次数
const SOCKET_RECONNECT_DELAY = 5000 // 重连间隔5秒

// 初始化Socket.IO连接
const initWebSocket = () => {
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
      transports: ['websocket', 'polling'],
      forceNew: true
    })

    websocket.value.on('connect', () => {
      console.log('Socket.IO连接成功')
      wsConnected.value = true
      // 连接成功后立即获取任务列表
      //sendWebSocketMessage({ type: 'get_tasks' })
    })

    websocket.value.on('message', (data) => {
      try {
        handleWebSocketMessage(data)
      } catch (error) {
        console.error('处理Socket.IO消息失败:', error)
      }
    })

       websocket.value.on('event', (data) => {
      try {
        console.log(data)
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

    websocket.value.on('connect_error', (error) => {
      console.error('Socket.IO连接错误:', error)
      wsConnected.value = false
    })

    console.log('开始连接Socket.IO...')
    websocket.value.connect()
    
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
  const index = asyncTasks.value.findIndex(t => t.id === task.id)
  if (index !== -1) {
    asyncTasks.value[index] = task
  }
}

// 添加任务
const addTask = (task) => {
  const exists = asyncTasks.value.some(t => t.id === task.id)
  if (!exists) {
    asyncTasks.value.unshift(task)
  }
}

// 移除任务
const removeTask = (taskId) => {
  asyncTasks.value = asyncTasks.value.filter(t => t.id !== taskId)
}

// 发送Socket.IO消息
const sendWebSocketMessage = (message) => {
  if (websocket.value && wsConnected.value) {
    try {
      websocket.value.emit('message', message)
    } catch (error) {
      console.error('发送Socket.IO消息失败:', error)
    }
  } else {
    console.warn('Socket.IO未连接，无法发送消息')
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

// 打开任务管理面板
const openTaskDrawer = () => {
  taskDrawerVisible.value = true
  initWebSocket()
}

// 关闭任务管理面板
const closeTaskDrawer = () => {
  taskDrawerVisible.value = false
  closeWebSocket()
}

// 加载任务列表
const loadTasks = () => {
  sendWebSocketMessage({ type: 'get_tasks' })
}

// 获取任务状态文本
const getTaskStatusText = (status) => {
  const statusMap = {
    [TaskStatus.PENDING]: '等待中',
    [TaskStatus.RUNNING]: '进行中',
    [TaskStatus.SUCCESS]: '已完成',
    [TaskStatus.FAILED]: '失败'
  }
  return statusMap[status] || status
}

// 获取任务状态类型
const getTaskStatusType = (status) => {
  const typeMap = {
    [TaskStatus.PENDING]: 'info',
    [TaskStatus.RUNNING]: 'warning',
    [TaskStatus.SUCCESS]: 'success',
    [TaskStatus.FAILED]: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取任务类型图标
const getTaskTypeIcon = (type) => {
  const iconMap = {
    export: 'Download',
    import: 'Upload',
    delete: 'Delete',
    update: 'Edit'
  }
  return Icons[iconMap[type]] || Icons.List
}

// 删除任务
const deleteTask = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条任务记录吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 通过WebSocket发送删除请求
    sendWebSocketMessage({ type: 'delete_task', task_id: taskId })
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 清空所有任务
const clearAllTasks = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有任务记录吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 通过WebSocket发送清空请求
    sendWebSocketMessage({ type: 'clear_tasks' })
    ElMessage.success('清空成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败: ' + error.message)
    }
  }
}

// 组件卸载时关闭WebSocket连接
import { onUnmounted } from 'vue'
onUnmounted(() => {
  closeWebSocket()
})

// 列索引到字段的映射
const reversedColsIndex = ref({})//computed(() => [...colsIndex.value].reverse());

// 加载表列表
const loadTables = async () => {
  try {
    loading.value = true
    const data = await getTables()
    tables.value = data?.data || []

    // 如果有表且没有选中表，默认选中第一个
    if (tables.value.length > 0 && !currentTable.value) {
      currentTable.value = tables.value[0]
      await loadTableSchema()
      await loadTableData()
    }
  } catch (error) {
    ElMessage.error('加载表列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 加载表结构
const loadTableSchema = async () => {
  if (!currentTable.value) return

  try {
    loading.value = true
    const data = await getTableSchema(currentTable.value)
    tableSchema.value = data.data || []
  } catch (error) {
    ElMessage.error('加载表结构失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 加载表数据
const loadTableData = async () => {
  if (!currentTable.value) return

  try {
    loading.value = true
    const data = await getTableData(currentTable.value, {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      filters: filters.value,
      sort: sort.value
    })
    tableData.value = data.data.data || []
    colsIndex.value = data.data.cols_index || {}

    reversedColsIndex.value = Object.entries(colsIndex.value).reduce((acc, [name, key]) => {
        acc[key] = name
        return acc
    }, {})
    //reversedColsIndex.value = [...data.data.cols_index].reverse();
    pagination.value.total = data.data.total+1//data.total || 0
  } catch (error) {
    ElMessage.error('加载表数据失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 切换表
const handleTableChange = async () => {
  pagination.value.page = 1
  filters.value = {}
  sort.value = { field: '', order: 'asc' }
  await loadTableSchema()
  await loadTableData()
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadTableData()
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.value.page = page
  loadTableData()
}

// 排序改变
const handleSortChange = ({ prop, order }) => {
  sort.value.field = prop
  sort.value.order = order === 'descending' ? 'desc' : 'asc'
  loadTableData()
}

// 打开新增对话框
const openAddDialog = () => {
  isAddMode.value = true
  editFormData.value = {}

  // 初始化表单数据
  tableSchema.value.forEach(column => {
    if (!column.autoIncrement) {
      editFormData.value[column.name] = ''
    }
  })

  editDialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (row) => {
  isAddMode.value = false

  console.log('reversedColsIndex:', reversedColsIndex.value)

  editFormData.value = {}
  Object.entries(row).forEach(([key, value]) => {
    const reversedKey = reversedColsIndex.value[key]
    if (reversedKey) {
      editFormData.value[reversedKey] = value
    }
  })

  console.log('editFormData:', editFormData.value)
  //{ ...row }
  editDialogVisible.value = true
}

// 保存数据
const saveData = async () => {
  if (!currentTable.value) return

  try {
    loading.value = true

    if (isAddMode.value) {
      await insertData(currentTable.value, editFormData.value)
      ElMessage.success('添加成功')
    } else {
      const rowKey = editFormData.value.row_key || editFormData.value.default
      await updateData(currentTable.value, rowKey, editFormData.value)
      ElMessage.success('更新成功')
    }

    editDialogVisible.value = false
    await loadTableData()
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 删除数据
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条数据吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const rowKey = row.row_key || row.id
    await deleteData(currentTable.value, rowKey)
    ElMessage.success('删除成功')
    await loadTableData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条数据吗?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const rowKeys = selectedRows.value.map(row => row.row_key || row.id)
    await batchDeleteData(currentTable.value, rowKeys)
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    await loadTableData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }
}

// 导出数据
const handleExport = async (format) => {
  try {
    await exportData(currentTable.value, format)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  }
}

// 打开导入对话框
const openImportDialog = () => {
  importDialogVisible.value = true
  importFile.value = null
}

// 导入数据
const handleImport = async () => {
  if (!importFile.value) {
    ElMessage.warning('请先选择要导入的文件')
    return
  }

  try {
    loading.value = true
    await importData(currentTable.value, importFile.value)
    ElMessage.success('导入成功')
    importDialogVisible.value = false
    await loadTableData()
  } catch (error) {
    ElMessage.error('导入失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 文件选择
const handleFileChange = (file) => {
  importFile.value = file.raw
}

// 获取字段类型对应的输入控件类型
const getFieldType = (column) => {
  const type = column.type || 1

  if (type==3 || type==2 ) {
    return 'number'
  }
  if (type==4) {
    return 'datetime'
  }
  if (type==1) {
    return 'textarea'
  }
  return 'text'
}

// 打开修改表结构对话框
const openAlterSchemaDialog = () => {
  // 深拷贝当前表结构
  tempTableSchema.value = JSON.parse(JSON.stringify(tableSchema.value))
  alterSchemaDialogVisible.value = true
}

// 添加新字段
const addField = () => {
  tempTableSchema.value.push({
    name: '',
    type: 1,
    comment: '',
    required: false,
    primary_key: false,
    autoIncrement: false,
    width: 120,
    sortable: true
  })
}

// 删除字段
const removeField = (index) => {
  tempTableSchema.value.splice(index, 1)
}

// 保存表结构修改
const saveSchemaChanges = async () => {
  if (!currentTable.value) return
  
  // 验证字段名是否为空
  const hasEmptyName = tempTableSchema.value.some(field => !field.name || field.name.trim() === '')
  if (hasEmptyName) {
    ElMessage.warning('字段名不能为空')
    return
  }
  
  // 验证字段名是否重复
  const fieldNames = tempTableSchema.value.map(field => field.name)
  const uniqueFieldNames = new Set(fieldNames)
  if (fieldNames.length !== uniqueFieldNames.size) {
    ElMessage.warning('字段名不能重复')
    return
  }

  try {
    loading.value = true
    await alterTableSchema(currentTable.value, tempTableSchema.value)
    ElMessage.success('表结构修改成功')
    alterSchemaDialogVisible.value = false
    await loadTableSchema()
    await loadTableData()
  } catch (error) {
    ElMessage.error('修改表结构失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 打开新建表对话框
const openCreateTableDialog = () => {
  createTableForm.value = {
    name: '',
    schema: [{
      name: 'id',
      type: 2,
      comment: '主键ID',
      required: true,
      primary_key: true,
      autoIncrement: false,
      width: 120,
      sortable: true
    }]
  }
  createTableDialogVisible.value = true
}

// 新建表中添加字段
const addCreateTableField = () => {
  createTableForm.value.schema.push({
    name: '',
    type: 1,
    comment: '',
    required: false,
    primary_key: false,
    autoIncrement: false,
    width: 120,
    sortable: true
  })
}

// 新建表中删除字段
const removeCreateTableField = (index) => {
  createTableForm.value.schema.splice(index, 1)
}

// 创建表
const handleCreateTable = async () => {
  // 验证表名
  if (!createTableForm.value.name || createTableForm.value.name.trim() === '') {
    ElMessage.warning('请输入表名')
    return
  }

  // 验证字段
  if (createTableForm.value.schema.length === 0) {
    ElMessage.warning('请至少添加一个字段')
    return
  }

  // 验证字段名是否为空
  const hasEmptyName = createTableForm.value.schema.some(field => !field.name || field.name.trim() === '')
  if (hasEmptyName) {
    ElMessage.warning('字段名不能为空')
    return
  }

  // 验证字段名是否重复
  const fieldNames = createTableForm.value.schema.map(field => field.name)
  const uniqueFieldNames = new Set(fieldNames)
  if (fieldNames.length !== uniqueFieldNames.size) {
    ElMessage.warning('字段名不能重复')
    return
  }

  try {
    loading.value = true
    // 将schema数组转换为以字段名为属性名的对象
    const schemaObject = {}
    // 提取primary_key字段组成pk数据
    const pk = createTableForm.value.schema
      .filter(field => field.primary_key)
      .map(field => field.name)
    createTableForm.value.schema.forEach(field => {
      schemaObject[field.name] = {
        name: field.name,
        type: field.type,
        comment: field.comment,
        required: field.required,
        primary_key: field.primary_key
      }
    })
    await createTable(createTableForm.value.name, pk,schemaObject)
    ElMessage.success('创建表成功')
    createTableDialogVisible.value = false
    await loadTables()
  } catch (error) {
    ElMessage.error('创建表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  loadTables()
})
</script>

<template>
  <div class="data-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据管理</span>
        </div>
      </template>

      <!-- 表选择 -->
      <div class="table-selector">
        <el-select 
          v-model="currentTable" 
          placeholder="请选择表" 
          @change="handleTableChange"
          style="width: 300px"
        >
          <el-option
            v-for="table in tables"
            :key="table"
            :label="table"
            :value="table"
          />
        </el-select>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="success" :icon="Icons.Plus" @click="openCreateTableDialog">新建表</el-button>
        <el-button type="primary" :icon="Icons.Plus" @click="openAddDialog">新增</el-button>
        <el-button type="danger" :icon="Icons.Delete" @click="handleBatchDelete" :disabled="selectedRows.length === 0">批量删除</el-button>
        <el-button type="warning" :icon="Icons.Setting" @click="openAlterSchemaDialog">修改表结构</el-button>
        <el-dropdown @command="handleExport">
          <el-button :icon="Icons.Download">
            导出<el-icon class="el-icon--right"><component :is="Icons.ArrowDown" /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="csv">CSV格式</el-dropdown-item>
              <el-dropdown-item command="excel">Excel格式</el-dropdown-item>
              <el-dropdown-item command="json">JSON格式</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button :icon="Icons.Upload" @click="openImportDialog">导入</el-button>
        <el-button :icon="Icons.List" @click="openTaskDrawer">异步任务</el-button>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="selection => selectedRows = selection"
        @sort-change="handleSortChange"
        style="width: 100%; margin-top: 20px"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column
          v-for="column in tableSchema"
          :key="column.name"
          :prop="column.name"
          :label="column.comment || column.name"
          :sortable="column.sortable !== false ? 'custom' : false"
          :min-width="column.width || 120"
        >
          <template #default="{ row }">
            <span v-if="column.type==1 && row[colsIndex[column.name]]?.length > 50">
              {{ row[colsIndex[column.name]].substring(0, 50) }}...
            </span>
            <span v-else-if="column.type==4">{{ row[colsIndex[column.name]]}}</span>
            <span v-else>{{ row[colsIndex[column.name]] }}</span>
             
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" :icon="Icons.Edit" @click="openEditDialog(row)">编辑</el-button>
            <el-button type="danger" size="small" :icon="Icons.Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 编辑/新增对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="isAddMode ? '新增数据' : '编辑数据'"
      width="800px"
    >
      <el-form :model="editFormData" label-width="120px">
        <el-form-item
          v-for="column in tableSchema"
          :key="column.name"
          :label="column.comment || column.name"
          :required="column.required"
        >
          <!-- 数字输入 -->
          <el-input-number
            v-if="getFieldType(column) === 'number'"
            v-model="editFormData[column.name]"
            :disabled="column.autoIncrement || column.primary_key"
            :controls-position="right"
            style="width: 100%"
          />

          <!-- 日期时间输入 -->
          <el-date-picker
            v-else-if="getFieldType(column) === 'datetime'"
            v-model="editFormData[column.name]"
            type="datetime"
            placeholder="选择日期时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm:ss"
            :value-format="'YYYY-MM-DDTHH:mm:ss.SSSSSSZ'"
          />

          <!-- 文本域输入 -->
          <el-input
            v-else-if="getFieldType(column) === 'textarea'"
            v-model="editFormData[column.name]"
            type="textarea"
            :rows="4"
            placeholder="请输入内容"
          />

          <!-- 普通文本输入 -->
          <el-input
            v-else
            v-model="editFormData[column.name]"
            :disabled="column.type==6||column.type==8||column.type==0"
            placeholder="请输入内容"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveData">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入数据"
      width="500px"
    >
      <el-upload
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><component :is="Icons.UploadFilled" /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 CSV、Excel、JSON 格式文件
          </div>
        </template>
      </el-upload>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleImport">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 修改表结构对话框 -->
    <el-dialog
      v-model="alterSchemaDialogVisible"
      title="修改表结构"
      width="800px"
    >
      <div class="schema-actions">
        <el-button type="primary" :icon="Icons.Plus" @click="addField">添加字段</el-button>
      </div>
      
      <el-table :data="tempTableSchema" border style="width: 100%; margin-top: 15px; table-layout: auto;" class="schema-table">
        <el-table-column label="字段名">
          <template #default="{ row }">
            <el-input v-model="row.name" placeholder="请输入字段名" />
          </template>
        </el-table-column>
        
        <el-table-column label="字段类型">
          <template #default="{ row }">
            <el-select v-model="row.type" placeholder="请选择类型">
            <el-option label="二进制" :value="0" />
              <el-option label="字符串" :value="1" />
              <el-option label="整数" :value="2" />
              <el-option label="浮点数" :value="3" />
              <el-option label="日期时间" :value="4" />
              <el-option label="布尔值" :value="5" />
              <el-option label="ROWID" :value="6" />
              <el-option label="位图" :value="7" />              
              <el-option label="图片" :value="8" />
            </el-select>
          </template>
        </el-table-column>
        
        <el-table-column label="备注">
          <template #default="{ row }">
            <el-input v-model="row.comment" placeholder="请输入备注" />
          </template>
        </el-table-column>
        
        <el-table-column label="属性">
          <template #default="{ row }">
            <div class="checkbox-group">
              <el-checkbox v-model="row.required">必填</el-checkbox>
              <el-checkbox v-model="row.primary_key">主键</el-checkbox>
              <!--el-checkbox v-model="row.autoIncrement">自增</el-checkbox-->
            </div>
          </template>
        </el-table-column>
        
        <!--el-table-column label="宽度" width="100">
          <template #default="{ row }">
            <el-input-number v-model="row.width" :min="50" :max="500" size="small" />
          </template>
        </el-table-column-->
        
        <el-table-column label="操作">
          <template #default="{ $index }">
            <el-button type="danger" size="small" :icon="Icons.Delete" @click="removeField($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="alterSchemaDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveSchemaChanges">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新建表对话框 -->
    <el-dialog
      v-model="createTableDialogVisible"
      title="新建表"
      width="800px"
    >
      <el-form :model="createTableForm"  class="create-table-form">
        <el-form-item label="表名" required>
          <el-input v-model="createTableForm.name" placeholder="请输入表名" />
        </el-form-item>
      </el-form>

      <div class="schema-actions">
        <el-button type="primary" :icon="Icons.Plus" @click="addCreateTableField">添加字段</el-button>
      </div>

      <el-table :data="createTableForm.schema" border style="width: 100%; margin-top: 15px; table-layout: auto;" class="schema-table">
        <el-table-column label="字段名">
          <template #default="{ row }">
            <el-input v-model="row.name" placeholder="请输入字段名" />
          </template>
        </el-table-column>

        <el-table-column label="字段类型">
          <template #default="{ row }">
            <el-select v-model="row.type" placeholder="请选择类型">
              <el-option label="字符串" :value="1" />
              <el-option label="整数" :value="2" />
              <el-option label="浮点数" :value="3" />
              <el-option label="日期时间" :value="4" />
              <el-option label="布尔值" :value="5" />
              <el-option label="ROWID" :value="6" />
              <el-option label="位图" :value="7" />              
              <el-option label="图片" :value="8" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="备注">
          <template #default="{ row }">
            <el-input v-model="row.comment" placeholder="请输入备注" />
          </template>
        </el-table-column>

        <el-table-column label="属性">
          <template #default="{ row }">
            <div class="checkbox-group">
              <el-checkbox v-model="row.required">必填</el-checkbox>
              <el-checkbox v-model="row.primary_key">主键</el-checkbox>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作">
          <template #default="{ $index }">
            <el-button type="danger" size="small" :icon="Icons.Delete" @click="removeCreateTableField($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createTableDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreateTable">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 异步任务管理抽屉 -->
    <el-drawer
      v-model="taskDrawerVisible"
      title="异步任务管理"
      direction="rtl"
      size="40%"
      @close="closeTaskDrawer"
    >
      <div class="task-drawer-content">
        <!-- WebSocket连接状态 -->
        <div class="ws-status">
          <el-tag :type="wsConnected ? 'success' : 'danger'" size="small">
            <el-icon class="status-icon"><component :is="wsConnected ? Icons.CircleCheck : Icons.CircleClose" /></el-icon>
            {{ wsConnected ? '已连接' : '未连接' }}
          </el-tag>
        </div>

        <!-- 任务统计 -->
        <div class="task-stats">
          <el-card>
            <el-row :gutter="20">
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ asyncTasks.length }}</div>
                  <div class="stat-label">总任务数</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ asyncTasks.filter(t => t.status === TaskStatus.RUNNING).length }}</div>
                  <div class="stat-label">进行中</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ asyncTasks.filter(t => t.status === TaskStatus.SUCCESS).length }}</div>
                  <div class="stat-label">已完成</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ asyncTasks.filter(t => t.status === TaskStatus.FAILED).length }}</div>
                  <div class="stat-label">失败</div>
                </div>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <!-- 任务操作 -->
        <div class="task-actions">
          <el-button type="primary" :icon="Icons.Refresh" @click="loadTasks" :disabled="!wsConnected">刷新</el-button>
          <el-button type="danger" :icon="Icons.Delete" @click="clearAllTasks" :disabled="asyncTasks.length === 0 || !wsConnected">清空所有</el-button>
          <el-button :icon="Icons.RefreshRight" @click="initWebSocket" v-if="!wsConnected">重新连接</el-button>
        </div>

        <!-- 任务列表 -->
        <div class="task-list">
          <el-empty v-if="asyncTasks.length === 0" description="暂无任务" />
          <el-card
            v-for="task in asyncTasks"
            :key="task.id"
            class="task-card"
            shadow="hover"
          >
            <div class="task-header">
              <div class="task-info">
                <el-icon class="task-icon"><component :is="getTaskTypeIcon(task.type)" /></el-icon>
                <span class="task-name">{{ task.name }}</span>
                <el-tag :type="getTaskStatusType(task.status)" size="small">{{ getTaskStatusText(task.status) }}</el-tag>
              </div>
              <el-button
                type="danger"
                size="small"
                :icon="Icons.Delete"
                link
                @click="deleteTask(task.id)"
              >
                删除
              </el-button>
            </div>
            
            <div class="task-progress">
              <el-progress
                :percentage="task.progress"
                :status="task.status === TaskStatus.FAILED ? 'exception' : task.status === TaskStatus.SUCCESS ? 'success' : ''"
              />
            </div>
            
            <div class="task-detail">
              <div class="detail-item">
                <span class="detail-label">创建时间:</span>
                <span class="detail-value">{{ task.createTime }}</span>
              </div>
              <div class="detail-item" v-if="task.finishTime">
                <span class="detail-label">完成时间:</span>
                <span class="detail-value">{{ task.finishTime }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态信息:</span>
                <span class="detail-value">{{ task.message }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.data-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-selector {
  margin-bottom: 20px;
}

.action-buttons {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.schema-actions {
  margin-bottom: 15px;
  display: flex;
  justify-content: flex-end;
}

.alter-schema-dialog :deep(.el-button--small) {
  padding-left: 12px;
  padding-right: 12px;
}

.alter-schema-dialog :deep(.schema-table) {
  width: 100%;
}

.alter-schema-dialog :deep(.schema-table .el-table__body-wrapper) {
  overflow-x: auto;
}

.alter-schema-dialog :deep(.el-checkbox) {
  white-space: nowrap;
}

:deep(.checkbox-group) {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
}

:deep(.checkbox-group .el-checkbox) {
  margin-right: 0;
  white-space: nowrap;
}

:deep(.checkbox-group .el-checkbox__label) {
  white-space: nowrap;
}

.create-table-form {
  text-align: left;
}

.create-table-form :deep(.el-form-item__content) {
  text-align: left;
}

/* 任务管理面板样式 */
.task-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 20px;
}

.ws-status {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.status-icon {
  margin-right: 4px;
}

.task-stats {
  margin-bottom: 10px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.task-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  transition: all 0.3s;
}

.task-card:hover {
  transform: translateY(-2px);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-icon {
  font-size: 18px;
  color: #409eff;
}

.task-name {
  font-weight: 500;
  font-size: 15px;
}

.task-progress {
  margin-bottom: 12px;
}

.task-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.detail-item {
  display: flex;
  gap: 8px;
}

.detail-label {
  color: #909399;
  min-width: 70px;
}

.detail-value {
  color: #606266;
  flex: 1;
}
</style>
