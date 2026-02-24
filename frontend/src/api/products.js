import client from './client'

export const productsAPI = {
  list: async () => {
    const response = await client.get('/products')
    return response.data
  },

  getAll: async () => {
    const response = await client.get('/products')
    return response.data
  },

  get: async (id) => {
    const response = await client.get(`/products/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/products', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await client.put(`/products/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    await client.delete(`/products/${id}`)
  },

  getCategories: async () => {
    const response = await client.get('/products/categories')
    return response.data
  },

  createCategory: async (name, description = null) => {
    const response = await client.post('/products/categories', null, {
      params: { name, description }
    })
    return response.data
  },

  getUnits: async () => {
    const response = await client.get('/products/units')
    return response.data
  },

  createUnit: async (name, short_name) => {
    const response = await client.post('/products/units', null, {
      params: { name, short_name }
    })
    return response.data
  },
}
