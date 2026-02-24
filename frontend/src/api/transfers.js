import client from './client'

export const transfersAPI = {
  list: async (params = {}) => {
    const response = await client.get('/transfers', { params })
    return response.data
  },

  get: async (id) => {
    const response = await client.get(`/transfers/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/transfers', data)
    return response.data
  },

  confirm: async (id) => {
    const response = await client.post(`/transfers/${id}/confirm`)
    return response.data
  },

  cancel: async (id) => {
    const response = await client.delete(`/transfers/${id}`)
    return response.data
  },
}
