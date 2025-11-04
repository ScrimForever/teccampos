const API_BASE_URL = 'http://127.0.0.1:8888'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
    this.token = localStorage.getItem('bearerToken')
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('bearerToken', token)
    } else {
      localStorage.removeItem('bearerToken')
    }
  }

  getToken() {
    return localStorage.getItem('bearerToken')
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const config = {
      ...options,
      headers,
    }

    try {
      const response = await fetch(url, config)

      if (response.status === 401) {
        this.setToken(null)
        throw new Error('Unauthorized. Please login again.')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const err = new Error(error.message || `HTTP error! status: ${response.status}`)
        err.status = response.status
        err.responseData = error
        throw err
      }

      const contentType = response.headers.get('content-type')
      let data
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      return {
        status: response.status,
        data: data,
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to API. Please ensure the server is running.')
      }
      throw error
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async postFormData(endpoint, data, options = {}) {
    const formData = new URLSearchParams()
    for (const key in data) {
      formData.append(key, data[key])
    }

    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
    })
  }

  async verifyToken() {
    try {
      await this.get('/auth/verify')
      return true
    } catch (error) {
      return false
    }
  }
}

export const api = new ApiService()
export default api
