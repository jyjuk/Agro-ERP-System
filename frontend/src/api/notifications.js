import client from './client'

export const notificationsAPI = {
  checkLowStock: async () => {
    const response = await client.get('/notifications/low-stock')
    return response.data
  },

  testTelegram: async () => {
    const response = await client.post('/notifications/test')
    return response.data
  },
}
