import client from './client'

export const reportsAPI = {
  getDashboard: async () => {
    const response = await client.get('/reports/dashboard')
    return response.data
  },

  getPurchaseReport: async (params = {}) => {
    const response = await client.get('/reports/purchases', { params })
    return response.data
  },

  getCostAnalysis: async (params = {}) => {
    const response = await client.get('/reports/cost-analysis', { params })
    return response.data
  },

  getSupplierReport: async (params = {}) => {
    const response = await client.get('/reports/suppliers', { params })
    return response.data
  },

  getDepartmentReport: async (params = {}) => {
    const response = await client.get('/reports/departments', { params })
    return response.data
  },

  getMaterialReport: async (params = {}) => {
    const response = await client.get('/reports/materials', { params })
    return response.data
  },
}
