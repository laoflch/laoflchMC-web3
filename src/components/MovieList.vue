<script setup>
import { ref, onMounted } from 'vue'
import { listMovies } from '@/services/movies'

const movies = ref([])
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    movies.value = await listMovies()
  } catch (err) {
    // 全局 Element Plus message 在项目中已可直接调用
    if (typeof ElMessage !== 'undefined') {
      ElMessage.error(`加载电影失败：${err.message || err}`)
    } else {
      console.error('加载电影失败', err)
    }
    movies.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="movie-list">
    <el-card>
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0">电影列表</h3>
        <el-button type="primary" @click="load">刷新</el-button>
      </div>

      <el-table :data="movies" v-loading="loading" stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="片名" />
        <el-table-column prop="year" label="年份" width="100" />
        <el-table-column prop="rating" label="评分" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.movie-list {
  padding: 16px;
}
</style>
