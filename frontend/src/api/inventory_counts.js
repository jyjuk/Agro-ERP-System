import client from './client'

export const inventoryCountsAPI = {
  list: async (params = {}) => {
    const response = await client.get('/inventory-counts/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await client.get(`/inventory-counts/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/inventory-counts/', data)
    return response.data
  },

  updateItems: async (id, items) => {
    const response = await client.put(`/inventory-counts/${id}/items`, { items })
    return response.data
  },

  approve: async (id) => {
    const response = await client.post(`/inventory-counts/${id}/approve`)
    return response.data
  },

  delete: async (id) => {
    const response = await client.delete(`/inventory-counts/${id}`)
    return response.data
  },
}
