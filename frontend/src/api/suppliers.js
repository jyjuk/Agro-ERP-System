import client from './client'

export const suppliersAPI = {
  list: async () => {
    const response = await client.get('/suppliers')
    return response.data
  },

  get: async (id) => {
    const response = await client.get(`/suppliers/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/suppliers', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await client.put(`/suppliers/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    await client.delete(`/suppliers/${id}`)
  },
}
