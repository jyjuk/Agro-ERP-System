import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, TablePagination, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, IconButton, Collapse,
  Alert, Snackbar, CircularProgress, Tooltip
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import { inventoryCountsAPI } from '../../api/inventory_counts'
import { departmentsAPI } from '../../api/departments'
import { useAuth } from '../../context/AuthContext'
import { usePagination } from '../../hooks/usePagination'

const STATUS_LABEL = { in_progress: 'В процесі', approved: 'Підтверджено' }
const STATUS_COLOR = { in_progress: 'warning', approved: 'success' }

const fmt = (v) => (v !== undefined && v !== null ? Number(v).toFixed(3).replace(/\.?0+$/, '') : '0')

const InventoryCountsPage = () => {
  const { isAdmin } = useAuth()
  const [counts, setCounts] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)   // який акт зараз редагується
  const [editValues, setEditValues] = useState({})   // {item_id: actual_quantity}
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ department_id: '', date: new Date().toISOString().slice(0, 10), notes: '' })
  const [creating, setCreating] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })
  const [detailMap, setDetailMap] = useState({})  // {count_id: items[]}
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate, reset } = usePagination(20)

  useEffect(() => {
    loadAll()
    departmentsAPI.list().then(setDepartments).catch(() => {})
  }, [filterDept, filterStatus])

  const loadAll = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterDept) params.department_id = filterDept
      if (filterStatus) params.status = filterStatus
      const data = await inventoryCountsAPI.list(params)
      setCounts(data)
      reset()
    } catch {
      showSnack('Помилка завантаження', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity })

  const handleExpand = async (countId) => {
    if (expandedId === countId) {
      setExpandedId(null)
      setEditingId(null)
      return
    }
    setExpandedId(countId)
    setEditingId(null)
    if (!detailMap[countId]) {
      try {
        const detail = await inventoryCountsAPI.get(countId)
        setDetailMap(prev => ({ ...prev, [countId]: detail.items }))
      } catch {
        showSnack('Помилка завантаження позицій', 'error')
      }
    }
  }

  const handleStartEdit = (countId) => {
    const items = detailMap[countId] || []
    const vals = {}
    items.forEach(i => { vals[i.id] = String(i.actual_quantity) })
    setEditValues(vals)
    setEditingId(countId)
  }

  const handleSaveEdit = async (countId) => {
    const items = Object.entries(editValues).map(([id, actual_quantity]) => ({
      id: parseInt(id),
      actual_quantity: parseFloat(actual_quantity) || 0,
    }))
    try {
      const updated = await inventoryCountsAPI.updateItems(countId, items)
      setDetailMap(prev => ({ ...prev, [countId]: updated.items }))
      setEditingId(null)
      loadAll()
      showSnack('Збережено')
    } catch (e) {
      showSnack(e.response?.data?.detail || 'Помилка збереження', 'error')
    }
  }

  const handleApprove = async (countId, number) => {
    if (!window.confirm(`Підтвердити інвентаризацію ${number}?\nЗалишки будуть скориговані відповідно до фактичних даних.`)) return
    try {
      const res = await inventoryCountsAPI.approve(countId)
      showSnack(res.message || 'Підтверджено')
      setExpandedId(null)
      setDetailMap(prev => { const d = { ...prev }; delete d[countId]; return d })
      loadAll()
    } catch (e) {
      showSnack(e.response?.data?.detail || 'Помилка підтвердження', 'error')
    }
  }

  const handleDelete = async (countId, number) => {
    if (!window.confirm(`Видалити акт ${number}?`)) return
    try {
      await inventoryCountsAPI.delete(countId)
      showSnack('Видалено')
      setExpandedId(null)
      loadAll()
    } catch (e) {
      showSnack(e.response?.data?.detail || 'Помилка видалення', 'error')
    }
  }

  const handleCreate = async () => {
    if (!createForm.department_id || !createForm.date) return
    setCreating(true)
    try {
      const created = await inventoryCountsAPI.create({
        department_id: parseInt(createForm.department_id),
        date: createForm.date,
        notes: createForm.notes || null,
      })
      setCreateOpen(false)
      setCreateForm({ department_id: '', date: new Date().toISOString().slice(0, 10), notes: '' })
      setDetailMap(prev => ({ ...prev, [created.id]: created.items }))
      loadAll()
      setExpandedId(created.id)
      showSnack(`Акт ${created.number} створено`)
    } catch (e) {
      showSnack(e.response?.data?.detail || 'Помилка створення', 'error')
    } finally {
      setCreating(false)
    }
  }

  const getDiffColor = (diff) => {
    const d = parseFloat(diff)
    if (Math.abs(d) < 0.001) return 'text.primary'
    return d > 0 ? 'success.main' : 'error.main'
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Інвентаризація</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Новий акт
        </Button>
      </Box>

      {/* Фільтри */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select size="small" label="Підрозділ"
              value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <MenuItem value="">Всі</MenuItem>
              {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select size="small" label="Статус"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <MenuItem value="">Всі</MenuItem>
              <MenuItem value="in_progress">В процесі</MenuItem>
              <MenuItem value="approved">Підтверджено</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={40} />
                <TableCell>Номер</TableCell>
                <TableCell>Дата</TableCell>
                <TableCell>Підрозділ</TableCell>
                <TableCell align="right">Позицій</TableCell>
                <TableCell align="right">Розбіжностей</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Створив</TableCell>
                <TableCell>Підтвердив</TableCell>
                <TableCell align="right">Дії</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={10} align="center"><CircularProgress size={24} /></TableCell></TableRow>
              )}
              {!loading && counts.length === 0 && (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>Немає актів інвентаризації</TableCell></TableRow>
              )}
              {!loading && paginate(counts).map(count => (
                <>
                  <TableRow key={count.id} hover sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleExpand(count.id)}>
                        {expandedId === count.id ? <CollapseIcon /> : <ExpandIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell><strong>{count.number}</strong></TableCell>
                    <TableCell>{count.date}</TableCell>
                    <TableCell>{count.department_name}</TableCell>
                    <TableCell align="right">{count.items_count}</TableCell>
                    <TableCell align="right">
                      {count.discrepancy_count > 0
                        ? <Typography color="error.main" variant="body2" fontWeight={600}>{count.discrepancy_count}</Typography>
                        : <Typography color="success.main" variant="body2">0</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      <Chip label={STATUS_LABEL[count.status] || count.status}
                        color={STATUS_COLOR[count.status] || 'default'} size="small" />
                    </TableCell>
                    <TableCell>{count.created_by_name || '—'}</TableCell>
                    <TableCell>{count.approved_by_name || '—'}</TableCell>
                    <TableCell align="right">
                      {count.status === 'in_progress' && (
                        <>
                          {isAdmin() && (
                            <Tooltip title="Підтвердити та скоригувати залишки">
                              <IconButton size="small" color="success"
                                onClick={() => handleApprove(count.id, count.number)}>
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Видалити">
                            <IconButton size="small" color="error"
                              onClick={() => handleDelete(count.id, count.number)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded: позиції */}
                  <TableRow key={`detail-${count.id}`}>
                    <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedId === count.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2">
                              Позиції акту {count.number}
                            </Typography>
                            {count.status === 'in_progress' && (
                              editingId === count.id ? (
                                <Button size="small" variant="contained" startIcon={<SaveIcon />}
                                  onClick={() => handleSaveEdit(count.id)}>
                                  Зберегти зміни
                                </Button>
                              ) : (
                                <Button size="small" variant="outlined" startIcon={<EditIcon />}
                                  onClick={() => handleStartEdit(count.id)}>
                                  Редагувати факт
                                </Button>
                              )
                            )}
                          </Box>

                          {!detailMap[count.id] ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: 'white' }}>
                                  <TableCell>Матеріал</TableCell>
                                  <TableCell>Код</TableCell>
                                  <TableCell align="right">За системою</TableCell>
                                  <TableCell align="right">Фактично</TableCell>
                                  <TableCell align="right">Різниця</TableCell>
                                  <TableCell>Примітки</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {detailMap[count.id].map(item => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.product_name}</TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">{item.product_code}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      {fmt(item.system_quantity)} {item.unit_name}
                                    </TableCell>
                                    <TableCell align="right">
                                      {editingId === count.id ? (
                                        <TextField
                                          size="small"
                                          type="number"
                                          value={editValues[item.id] ?? item.actual_quantity}
                                          onChange={e => setEditValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                                          inputProps={{ min: 0, step: 0.001, style: { textAlign: 'right', width: 90 } }}
                                          variant="outlined"
                                        />
                                      ) : (
                                        <Typography color={getDiffColor(item.difference)} fontWeight={Math.abs(parseFloat(item.difference)) > 0.001 ? 600 : 400}>
                                          {fmt(item.actual_quantity)} {item.unit_name}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography color={getDiffColor(item.difference)} fontWeight={Math.abs(parseFloat(item.difference)) > 0.001 ? 600 : 400}>
                                        {parseFloat(item.difference) > 0 ? '+' : ''}{fmt(item.difference)} {item.unit_name}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">{item.notes || '—'}</Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={counts.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Рядків на сторінці:"
          labelDisplayedRows={({ from, to, count: c }) => `${from}–${to} з ${c}`}
        />
      </Paper>

      {/* Діалог створення */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новий акт інвентаризації</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth select size="small" label="Підрозділ *"
                value={createForm.department_id}
                onChange={e => setCreateForm(f => ({ ...f, department_id: e.target.value }))}>
                <MenuItem value="">Оберіть підрозділ</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" type="date" label="Дата *"
                value={createForm.date}
                onChange={e => setCreateForm(f => ({ ...f, date: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Примітки" multiline rows={2}
                value={createForm.notes}
                onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            Буде автоматично заповнено усіма позиціями поточних залишків вибраного підрозділу.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating || !createForm.department_id || !createForm.date}>
            {creating ? 'Створення...' : 'Створити'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default InventoryCountsPage
