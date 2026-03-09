import client from './client'

export const auditAPI = {
  getLog: (params) => client.get('/audit/', { params }).then(r => r.data),
  getMeta: () => client.get('/audit/meta').then(r => r.data),
}
