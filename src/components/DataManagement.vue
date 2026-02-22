
<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as Icons from '@element-plus/icons-vue'
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
</style>
