import http from './http'
import { setToken, setRefreshToken, clearAllTokens, setUser, clearUser, getRefreshToken } from './auth'

// 调用后端登录接口，期望返回 { token, refreshToken }
export async function login(credentials) {
    console.log('authApi login called with credentials:', credentials);
  const data = await http.post('/api/auth', credentials)
  if (data && data.token) {
    setToken(data.token)
    if (data.refreshToken) setRefreshToken(data.refreshToken)
    if (credentials) setUser({ user_id: credentials.user_id, role: 'admin' })
  }
  return data
}

export async function refreshToken() {
  // 调用后端刷新接口，期望返回 { token, refreshToken }
  // 使用 refresh token 放在请求体中。
  const refreshToken = getRefreshToken()
  const data = await http.post('/auth/refresh', { refreshToken })
  if (data && data.token) {
    setToken(data.token)
    if (data.refreshToken) setRefreshToken(data.refreshToken)
  }
  return data
}

export async function logout() {
  try {
    await http.post('/auth/logout', {})
  } catch (e) {
    // ignore
  }
  clearAllTokens()
  clearUser()
}

export default { login, refreshToken, logout }
