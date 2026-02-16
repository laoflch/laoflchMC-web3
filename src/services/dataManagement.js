
// 数据管理服务
import http from './http'

// 获取数据表列表
export async function getTables() {
  return http.get('/api/storage/tables')
}

// 获取表结构
export async function getTableSchema(tableName) {
  return http.get(`/api/storage/table/schema/${tableName}`)
}

// 修改表结构
export async function alterTableSchema(tableName, schema) {
  return http.post(`/api/storage/table/schema/${tableName}`, schema)
}

// 获取表数据
export async function getTableData(tableName, params = {}) {
  const { page = 1, pageSize = 10, filters = {}, sort = {} } = params
  // const queryParams = new URLSearchParams()

  // queryParams.append('page', page)
  // queryParams.append('pageSize', pageSize)

  // // 添加过滤条件
  // if (Object.keys(filters).length > 0) {
  //   Object.keys(filters).forEach(key => {
  //     if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
  //       queryParams.append(`filter[${key}]`, filters[key])
  //     }
  //   })
  // }

  // // 添加排序条件
  // if (sort.field) {
  //   queryParams.append('sortField', sort.field)
  //   queryParams.append('sortOrder', sort.order || 'asc')
  // }

  // console.log('getTableData queryParams:', queryParams.toString())
  const data = {
       table: tableName,
       fetch_row_key:true,
       if_return_bytes:false,
       start:(page-1)*pageSize+1,
       size:pageSize
  }
  
  return http.post(`/api/storage/query/`, data)
}

// 插入数据
export async function insertData(tableName, data) {
  return http.post('/api/storage/insert', { table: tableName, data })
}

// 更新数据
export async function updateData(tableName, rowKey, data) {
  return http.post('/api/storage/update/row', { table: tableName, row_key: rowKey, data })
}

// 删除数据
export async function deleteData(tableName, rowKey) {
  return http.post('/api/storage/delete/row', { table: tableName, row_key: rowKey })
}

// 批量删除数据
export async function batchDeleteData(tableName, rowKeys) {
  return http.post('/api/storage/delete/batch', { table: tableName, row_keys: rowKeys })
}

// 执行自定义SQL查询
export async function executeQuery(sql) {
  return http.post('/api/storage/query', { sql })
}

// 导出数据
export async function exportData(tableName, format = 'csv') {
  return http.get(`/api/storage/export/${tableName}?format=${format}`)
}

// 导入数据
export async function importData(tableName, file) {
  const formData = new FormData()
  formData.append('table', tableName)
  formData.append('file', file)
  return http.post('/api/storage/import', formData)
}
