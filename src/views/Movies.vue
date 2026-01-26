<script setup>
import MovieList from '@/components/MovieList.vue'
import Layout from '@/components/layouts/Layout.vue'
</script>

<template>
  <div class="view-movies">
    <Layout>
      <movie-list />
    </Layout>
  </div>
</template>

<style scoped>

.content-wrapper { max-width: 1200px; margin: 0 auto }
</style>
