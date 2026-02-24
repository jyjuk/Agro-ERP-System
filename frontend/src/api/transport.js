import client from './client'

export const transportAPI = {
  list: async () => {
    const response = await client.get('/transport/')
    return response.data
  },

  getTypes: async () => {
    const response = await client.get('/transport/types')
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/transport/', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await client.put(`/transport/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await client.delete(`/transport/${id}`)
    return response.data
  },
}
