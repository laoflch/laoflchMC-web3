import { getToken, clearToken, getRefreshToken, setToken, setRefreshToken, clearAllTokens } from './auth'
import authApi from './authApi'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const msg = text || res.statusText || `HTTP ${res.status}`
    const e = new Error(msg)
    e.status = res.status
    throw e
  }
  return res.json().catch(() => null)
}

function buildUrl(path) {
  if (!path) return API_BASE
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

async function request(path, options = {}) {
  const url = buildUrl(path)
  const headers = Object.assign({}, options.headers || {})

  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const opts = Object.assign({}, options, { headers })

  const res = await fetch(url, opts).catch((err) => {
    // network error
    const e = new Error(err.message || 'Network error')
    throw e
  })

  if (res.status === 401) {
    // 尝试使用 refresh token 刷新（如果存在）并重试一次
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
          // use raw fetch to call refresh endpoint with refresh token in request body
          const refreshUrl = buildUrl('/auth/refresh')
          const rres = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          })
          if (rres.ok) {
            const d = await rres.json().catch(() => null)
            if (d && d.token) {
              setToken(d.token)
              if (d.refreshToken) setRefreshToken(d.refreshToken)
              // retry original request with new token
              const retryHeaders = Object.assign({}, opts.headers || {})
              retryHeaders['Authorization'] = `Bearer ${d.token}`
              const retryRes = await fetch(url, Object.assign({}, opts, { headers: retryHeaders }))
              return handleResponse(retryRes)
            }
          }
        } catch (e) {
          // continue to clear tokens and notify
        }
    }

    // 如果刷新失败或不存在 refresh token，则清理并通知
    try { clearAllTokens() } catch (e) {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-unauthorized'))
    }
    const e = new Error('Unauthorized')
    e.status = 401
    throw e
  }

  return handleResponse(res)
}

export function get(path, params) {
  let query = ''
  if (params && typeof params === 'object') {
    const qs = new URLSearchParams(params).toString()
    query = qs ? `?${qs}` : ''
  }
  return request(`${path}${query}`, { method: 'GET' })
}

export function post(path, body) {
  const opts = {}
  if (body instanceof FormData) {
    opts.body = body
  } else {
    opts.body = JSON.stringify(body)
    opts.headers = { 'Content-Type': 'application/json' }
  }
  opts.method = 'POST'
  return request(path, opts)
}

export function put(path, body) {
  const opts = { method: 'PUT' }
  opts.body = JSON.stringify(body)
  opts.headers = { 'Content-Type': 'application/json' }
  return request(path, opts)
}

export function del(path) {
  return request(path, { method: 'DELETE' })
}

export default { request, get, post, put, del }
