import { useState, useEffect, Fragment } from 'react'
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Box,
  Alert,
  IconButton,
  Collapse,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material'
import { usePagination } from '../../hooks/usePagination'
import {
  CheckCircle as ConfirmIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material'
import { writeoffsAPI } from '../../api/writeoffs'
import { departmentsAPI } from '../../api/departments'
import CreateWriteOffDialog from '../../components/writeoffs/CreateWriteOffDialog'
import { useAuth } from '../../context/AuthContext'

export default function WriteOffsList() {
  const { isAdmin, isDepartmentHead } = useAuth()
  const [writeoffs, setWriteoffs] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    department_id: '',
  })
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(25)

  useEffect(() => {
    loadWriteOffs()
    loadDepartments()
  }, [filters])

  const loadWriteOffs = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.department_id) params.department_id = filters.department_id

      const data = await writeoffsAPI.getAll(params)
      setWriteoffs(data)
      setError('')
    } catch (err) {
      console.error('Failed to load write-offs:', err)
      setError('Помилка завантаження списань')
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const data = await departmentsAPI.getAll()
      setDepartments(data)
    } catch (err) {
      console.error('Failed to load departments:', err)
    }
  }

  const handleConfirm = async (id) => {
    if (!window.confirm('Підтвердити списання? Це оновить залишки на складі.')) {
      return
    }

    try {
      await writeoffsAPI.confirm(id)
      loadWriteOffs()
    } catch (err) {
      console.error('Failed to confirm write-off:', err)
      alert(err.response?.data?.detail || 'Помилка підтвердження списання')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Скасувати списання?')) {
      return
    }

    try {
      await writeoffsAPI.cancel(id)
      loadWriteOffs()
    } catch (err) {
      console.error('Failed to cancel write-off:', err)
      alert(err.response?.data?.detail || 'Помилка скасування списання')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'warning'
      case 'confirmed':
        return 'success'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft':
        return 'Чернетка'
      case 'confirmed':
        return 'Підтверджено'
      case 'cancelled':
        return 'Скасовано'
      default:
        return status
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Списання</Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          + Нове списання
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Статус"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              size="small"
            >
              <MenuItem value="">Всі</MenuItem>
              <MenuItem value="draft">Чернетка</MenuItem>
              <MenuItem value="confirmed">Підтверджено</MenuItem>
              <MenuItem value="cancelled">Скасовано</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Підрозділ"
              value={filters.department_id}
              onChange={(e) =>
                setFilters({ ...filters, department_id: e.target.value })
              }
              size="small"
            >
              <MenuItem value="">Всі</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Номер</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Підрозділ</TableCell>
              <TableCell>Причина</TableCell>
              <TableCell align="right">Сума</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="center">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : writeoffs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Немає списань
                </TableCell>
              </TableRow>
            ) : (
              paginate(writeoffs).map((writeoff) => (
                <Fragment key={writeoff.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpand(writeoff.id)}>
                        {expandedId === writeoff.id ? <CollapseIcon /> : <ExpandIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{writeoff.number}</TableCell>
                    <TableCell>{writeoff.date}</TableCell>
                    <TableCell>{writeoff.department?.name}</TableCell>
                    <TableCell>{writeoff.reason}</TableCell>
                    <TableCell align="right">
                      {writeoff.total_cost > 0 ? `₴${writeoff.total_cost}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(writeoff.status)}
                        color={getStatusColor(writeoff.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {writeoff.status === 'draft' && (
                        <>
                          {isAdmin() && (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleConfirm(writeoff.id)}
                              title="Підтвердити"
                            >
                              <ConfirmIcon />
                            </IconButton>
                          )}
                          {!isDepartmentHead() && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCancel(writeoff.id)}
                              title="Скасувати"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0 }}>
                      <Collapse in={expandedId === writeoff.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Позиції списання:
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Товар</TableCell>
                                <TableCell align="right">Кількість</TableCell>
                                <TableCell align="right">Собівартість</TableCell>
                                <TableCell align="right">Сума</TableCell>
                                <TableCell>Примітки</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {writeoff.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product?.name}</TableCell>
                                  <TableCell align="right">{item.quantity}</TableCell>
                                  <TableCell align="right">
                                    {item.unit_cost ? `₴${item.unit_cost}` : '-'}
                                  </TableCell>
                                  <TableCell align="right">
                                    {item.total_cost ? `₴${item.total_cost}` : '-'}
                                  </TableCell>
                                  <TableCell>{item.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {writeoff.notes && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Примітки:</strong> {writeoff.notes}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={writeoffs.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Рядків на сторінці:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} з ${count}`}
        />
      </TableContainer>

      <CreateWriteOffDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={loadWriteOffs}
      />
    </Container>
  )
}
