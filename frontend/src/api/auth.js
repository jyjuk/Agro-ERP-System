const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const authAPI = {
  login: async (username, password) => {
    // Use native fetch to avoid axios transformations
    const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`

    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Backend error response:', error)

      // Format error message
      let message = 'Login failed'
      if (error.detail) {
        if (Array.isArray(error.detail)) {
          message = error.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('; ')
        } else if (typeof error.detail === 'string') {
          message = error.detail
        } else {
          message = JSON.stringify(error.detail)
        }
      }

      const err = new Error(message)
      err.response = { data: error }
      throw err
    }

    return await response.json()
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_data')
    window.location.href = '/login'
  },
}
