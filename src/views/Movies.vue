<script setup>
import { ref } from 'vue'
import MovieList from '@/components/MovieList.vue'
import PersonList from '@/components/PersonList.vue'
import Layout from '@/components/layouts/Layout.vue'

const activeTab = ref('movies')
</script>

<template>
  <div class="view-movies">
    <Layout>
      <el-tabs v-model="activeTab" class="content-tabs">
        <el-tab-pane label="电影" name="movies">
          <movie-list />
        </el-tab-pane>
        <el-tab-pane label="影人" name="persons">
          <person-list />
        </el-tab-pane>
      </el-tabs>
    </Layout>
  </div>
</template>

<style scoped>
.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  width: 100% !important;
}

.content-tabs {
  width: 100%;
}

/* 确保响应式布局正常工作 */
:deep(.el-tabs__content) {
  width: 100%;
}

:deep(.el-tab-pane) {
  width: 100%;
}
</style>
