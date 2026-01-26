// 简单的 JWT 本地存储助手。
// 存储键名使用 jwt_token；可根据项目需要替换为其他名称或移动到更安全的位置。
export function getToken() {
  try {
    return localStorage.getItem('jwt_token') || null
  } catch (e) {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem('jwt_token', token)
  } catch (e) {
    // ignore
  }
}

export function clearToken() {
  try {
    localStorage.removeItem('jwt_token')
  } catch (e) {
    // ignore
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem('jwt_refresh') || null
  } catch (e) {
    return null
  }
}

export function setRefreshToken(token) {
  try {
    localStorage.setItem('jwt_refresh', token)
  } catch (e) {
    // ignore
  }
}

export function clearRefreshToken() {
  try {
    localStorage.removeItem('jwt_refresh')
  } catch (e) {
    // ignore
  }
}

export function clearAllTokens() {
  clearToken()
  clearRefreshToken()
}

export function getUser() {
  try {
    const raw = localStorage.getItem('user_info')
    console.log('getUser raw:', raw);
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function setUser(user) {
  try {
    localStorage.setItem('user_info', JSON.stringify(user))
  } catch (e) {
    // ignore
  }
}

export function clearUser() {
  try {
    localStorage.removeItem('user_info')
  } catch (e) {
    // ignore
  }
}
