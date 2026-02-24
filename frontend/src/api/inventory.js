import client from './client'

export const inventoryAPI = {
  list: async (params = {}) => {
    const response = await client.get('/inventory', { params })
    return response.data
  },

  getDepartmentSummary: async (departmentId) => {
    const response = await client.get(`/inventory/department/${departmentId}/summary`)
    return response.data
  },

  getValues: async (params = {}) => {
    const response = await client.get('/inventory/value', { params })
    return response.data
  },

  getTransactions: async (params = {}) => {
    const response = await client.get('/inventory/transactions', { params })
    return response.data
  },

  getLowStock: async () => {
    const response = await client.get('/inventory/low-stock')
    return response.data
  },
}
