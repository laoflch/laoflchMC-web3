
// 电影服务（真实后端调用）
// 配置：在 .env 或 Vite 环境变量中设置 VITE_API_BASE，例如 VITE_API_BASE="https://api.example.com"
import http from './http'

export async function listMovies() {
  return http.get('/movies')
}

export async function getMovie(id) {
  return http.get(`/movies/${id}`)
}

export async function createMovie(payload) {
  return http.post('/movies', payload)
}

export async function deleteMovie(id) {
  return http.del(`/movies/${id}`)
}
