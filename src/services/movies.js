
// 电影服务（真实后端调用）
// 配置：在 .env 或 Vite 环境变量中设置 VITE_API_BASE，例如 VITE_API_BASE="https://api.example.com"
import http from './http'

export async function listMovies(params = {}) {
  const { page = 1, pageSize = 10 } = params
  const res = await http.get(`/api/video/movie-rep/list/${page}/${pageSize}`)

  //console.log('listMovies response:', res);

  /*function findFirstArray(obj, depth = 0) {
    if (!obj || depth > 4) return null
    if (Array.isArray(obj)) return obj
    if (typeof obj !== 'object') return null
    for (const key of Object.keys(obj)) {
      try {
        const val = obj[key]
        if (Array.isArray(val)) return val
        if (val && typeof val === 'object') {
          const found = findFirstArray(val, depth + 1)
          if (found) return found
        }
      } catch (e) {
        // ignore
      }
    }
    return null
  }*/

  //const arr = res ? res : {}
  return res
}

export async function getMovie(id) {
  return http.get(`/movies/${id}`)
}

export async function createMovie(payload) {
  const data = { table: 'movie_info', data: payload }
  return http.post('/api/storage/insert', data)
}

export async function updateMovie(payload) {
  const { row_key, ...newdata } = payload;
  const data = { table: 'movie_info',"row_key":row_key, data: newdata }
  //console.log('updateMovie payload:', newdata)
  return http.post('/api/storage/update/row', data)
}

export async function deleteMovie(id) {
  return http.del(`/movies/${id}`)
}

export async function uploadImage(file, type = 'movie_posters') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('space_name', type)
  formData.append('image_name', file.name)
  console.log('uploadImage formData:', formData)
  
  return http.post(`/api/image/upload/`, formData)
}

export async function loadImdbImage(url) {
 const data = {
      imdb_image_name: url,
      name_space: "movie_image",
      image_comment:"",
      image_text:""
 }
  return http.post(`/api/image/upload/from-imdb`, data)
}
