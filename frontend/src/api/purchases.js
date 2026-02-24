import client from './client'

export const purchasesAPI = {
  list: async (params = {}) => {
    const response = await client.get('/purchases', { params })
    return response.data
  },

  get: async (id) => {
    const response = await client.get(`/purchases/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/purchases', data)
    return response.data
  },

  confirm: async (id) => {
    const response = await client.post(`/purchases/${id}/confirm`)
    return response.data
  },

  cancel: async (id) => {
    const response = await client.delete(`/purchases/${id}`)
    return response.data
  },
}
