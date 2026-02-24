import client from './client'

export const writeoffsAPI = {
  getAll: async (params = {}) => {
    const response = await client.get('/writeoffs', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await client.get(`/writeoffs/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/writeoffs', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await client.put(`/writeoffs/${id}`, data)
    return response.data
  },

  confirm: async (id) => {
    const response = await client.post(`/writeoffs/${id}/confirm`)
    return response.data
  },

  cancel: async (id) => {
    const response = await client.delete(`/writeoffs/${id}`)
    return response.data
  },
}
