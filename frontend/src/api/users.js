import client from './client'

export const usersAPI = {
  list: async (params = {}) => {
    const response = await client.get('/users', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await client.get(`/users/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/users', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await client.put(`/users/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await client.delete(`/users/${id}`)
    return response.data
  },

  getRoles: async () => {
    const response = await client.get('/users/roles/list')
    return response.data
  },
}
