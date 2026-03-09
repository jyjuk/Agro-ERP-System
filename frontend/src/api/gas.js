import client from './client'

export const gasAPI = {
  listMonths: ()           => client.get('/gas/').then(r => r.data),
  getMonth:   (month)      => client.get(`/gas/${month}`).then(r => r.data),
  save:       (data)       => client.post('/gas/save', data).then(r => r.data),
  deleteMonth:(month)      => client.delete(`/gas/${month}`).then(r => r.data),
}
