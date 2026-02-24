import client from './client'

export const departmentsAPI = {
  list: async () => {
    const response = await client.get('/departments')
    return response.data
  },

  getAll: async () => {
    const response = await client.get('/departments')
    return response.data
  },
}
