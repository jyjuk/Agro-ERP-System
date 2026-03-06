import client from './client'

export const electricityAPI = {
  getMonth: async (month) => {
    const response = await client.get(`/electricity/${month}`)
    return response.data
  },

  save: async (data) => {
    const response = await client.post('/electricity/save', data)
    return response.data
  },

  listMonths: async () => {
    const response = await client.get('/electricity/')
    return response.data
  },
}
