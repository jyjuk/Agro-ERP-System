import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Collapse,
} from '@mui/material'
import { usePagination } from '../../hooks/usePagination'
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { transfersAPI } from '../../api/transfers'
import { departmentsAPI } from '../../api/departments'
import CreateTransferDialog from '../../components/transfers/CreateTransferDialog'
import { useAuth } from '../../context/AuthContext'

const TransfersList = () => {
  const { isAdmin } = useAuth()
  const [transfers, setTransfers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    from_department_id: '',
    to_department_id: '',
  })
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(25)

  useEffect(() => {
    loadTransfers()
    loadDepartments()
  }, [filters])

  const loadTransfers = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.from_department_id) params.from_department_id = filters.from_department_id
      if (filters.to_department_id) params.to_department_id = filters.to_department_id

      const data = await transfersAPI.list(params)
      setTransfers(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load transfers')
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
    if (!window.confirm('Підтвердити переміщення? Це оновить залишки на складах.')) {
      return
    }

    try {
      await transfersAPI.confirm(id)
      loadTransfers()
    } catch (err) {
      alert('Failed to confirm transfer: ' + (err.response?.data?.detail || err.message))
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading && transfers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success'
      case 'draft':
        return 'warning'
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Переміщення</Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          + Нове переміщення
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
          <Grid item xs={12} sm={4}>
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
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="З підрозділу"
              value={filters.from_department_id}
              onChange={(e) => setFilters({ ...filters, from_department_id: e.target.value })}
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
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="На підрозділ"
              value={filters.to_department_id}
              onChange={(e) => setFilters({ ...filters, to_department_id: e.target.value })}
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

      <CreateTransferDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={loadTransfers}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Номер</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>З</TableCell>
              <TableCell>На</TableCell>
              <TableCell align="right">Вартість</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Немає переміщень
                </TableCell>
              </TableRow>
            ) : (
              paginate(transfers).map((transfer) => (
                <>
                  <TableRow key={transfer.id}>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpand(transfer.id)}>
                        {expandedId === transfer.id ? <CollapseIcon /> : <ExpandIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{transfer.number}</TableCell>
                    <TableCell>
                      {format(new Date(transfer.date), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell>{transfer.from_department?.name || '-'}</TableCell>
                    <TableCell>{transfer.to_department?.name || '-'}</TableCell>
                    <TableCell align="right">
                      {transfer.total_cost > 0 ? `₴${parseFloat(transfer.total_cost).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(transfer.status)}
                        color={getStatusColor(transfer.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {transfer.status === 'draft' && isAdmin() && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleConfirm(transfer.id)}
                        >
                          Підтвердити
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0 }}>
                      <Collapse in={expandedId === transfer.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Позиції переміщення:
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
                              {transfer.items?.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product?.name || '-'}</TableCell>
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
                          {transfer.notes && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Примітки:</strong> {transfer.notes}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={transfers.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Рядків на сторінці:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} з ${count}`}
        />
      </TableContainer>
    </Box>
  )
}

export default TransfersList
