<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as Icons from '@element-plus/icons-vue'

// 全局索引模块
const globalIndexList = ref([])
const globalIndexSearch = ref('')
const globalIndexLoading = ref(false)

// 加载全局索引列表
const loadGlobalIndexList = async () => {
  try {
    globalIndexLoading.value = true
    // 这里应该调用获取全局索引的API
    // 暂时使用模拟数据
    globalIndexList.value = [
      {
        id: 1,
        name: '用户索引',
        table: 'users',
        fields: ['id', 'username'],
        type: 'UNIQUE',
        description: '用户表唯一索引'
      },
      {
        id: 2,
        name: '订单索引',
        table: 'orders',
        fields: ['user_id', 'order_date'],
        type: 'INDEX',
        description: '订单表普通索引'
      },
      {
        id: 3,
        name: '产品索引',
        table: 'products',
        fields: ['category_id', 'price'],
        type: 'INDEX',
        description: '产品表分类价格索引'
      }
    ]
  } catch (error) {
    ElMessage.error('加载全局索引列表失败: ' + error.message)
  } finally {
    globalIndexLoading.value = false
  }
}

// 搜索全局索引
const handleGlobalIndexSearch = () => {
  if (!globalIndexSearch.value) {
    loadGlobalIndexList()
    return
  }

  const searchValue = globalIndexSearch.value.toLowerCase()
  globalIndexList.value = globalIndexList.value.filter(item => 
    item.name.toLowerCase().includes(searchValue) ||
    item.table.toLowerCase().includes(searchValue) ||
    item.description?.toLowerCase().includes(searchValue)
  )
}

// 查看索引详情
const viewIndexDetail = (index) => {
  ElMessage.info(`查看索引详情: ${index.name}`)
  // 这里可以打开一个对话框显示索引详情
}

// 删除全局索引
const deleteGlobalIndex = async (indexId) => {
  try {
    await ElMessageBox.confirm('确定要删除该索引吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 这里应该调用删除索引的API
    const index = globalIndexList.value.findIndex(i => i.id === indexId)
    if (index !== -1) {
      globalIndexList.value.splice(index, 1)
    }
    ElMessage.success('删除索引成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除索引失败: ' + error.message)
    }
  }
}

// 初始化
onMounted(() => {
  loadGlobalIndexList()
})
</script>

<template>
  <div class="global-index-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>全局索引管理</span>
          <el-button type="primary" size="small" :icon="Icons.Refresh" @click="loadGlobalIndexList">刷新</el-button>
        </div>
      </template>

      <!-- 搜索框 -->
      <div class="global-index-search">
        <el-input
          v-model="globalIndexSearch"
          placeholder="搜索索引名称、表名或描述"
          :prefix-icon="Icons.Search"
          clearable
          @input="handleGlobalIndexSearch"
        />
      </div>

      <!-- 索引列表 -->
      <el-table
        v-loading="globalIndexLoading"
        :data="globalIndexList"
        border
        stripe
        style="width: 100%; margin-top: 20px; table-layout: auto;"
      >
        <el-table-column prop="name" label="索引名称" />
        <el-table-column prop="table" label="所属表" />
        <el-table-column label="索引字段">
          <template #default="{ row }">
            <el-tag
              v-for="(field, index) in row.fields"
              :key="index"
              style="margin-right: 5px; margin-bottom: 5px"
            >
              {{ field }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="索引类型">
          <template #default="{ row }">
            <el-tag :type="row.type === 'UNIQUE' ? 'warning' : 'info'">
              {{ row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button type="primary" size="small" :icon="Icons.View" @click="viewIndexDetail(row)">详情</el-button>
            <el-button type="danger" size="small" :icon="Icons.Delete" @click="deleteGlobalIndex(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.global-index-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.global-index-search {
  margin-bottom: 20px;
}

:deep(.el-table .el-table__cell) {
  white-space: nowrap;
}

:deep(.el-table .el-table__cell .cell) {
  white-space: nowrap;
}
</style>
