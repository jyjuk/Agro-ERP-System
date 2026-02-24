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
import { purchasesAPI } from '../../api/purchases'
import { suppliersAPI } from '../../api/suppliers'
import { departmentsAPI } from '../../api/departments'
import CreatePurchaseDialog from '../../components/purchases/CreatePurchaseDialog'
import { useAuth } from '../../context/AuthContext'

const PurchasesList = () => {
  const { isAdmin } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    supplier_id: '',
  })
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate, reset } = usePagination(25)

  useEffect(() => {
    loadPurchases()
    loadSuppliers()
    loadDepartments()
  }, [filters])

  const loadPurchases = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.supplier_id) params.supplier_id = filters.supplier_id

      const data = await purchasesAPI.list(params)
      setPurchases(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load purchases')
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const data = await suppliersAPI.list()
      setSuppliers(data)
    } catch (err) {
      console.error('Failed to load suppliers:', err)
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
    if (!window.confirm('Підтвердити закупівлю? Це оновить залишки на складі.')) {
      return
    }

    try {
      await purchasesAPI.confirm(id)
      loadPurchases()
    } catch (err) {
      alert('Failed to confirm purchase: ' + (err.response?.data?.detail || err.message))
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading && purchases.length === 0) {
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
        <Typography variant="h4">Закупівлі</Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          + Нова закупівля
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
              label="Постачальник"
              value={filters.supplier_id}
              onChange={(e) => setFilters({ ...filters, supplier_id: e.target.value })}
              size="small"
            >
              <MenuItem value="">Всі</MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <CreatePurchaseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={loadPurchases}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Номер</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Постачальник</TableCell>
              <TableCell>Підрозділ</TableCell>
              <TableCell align="right">Сума</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Немає закупівель
                </TableCell>
              </TableRow>
            ) : (
              paginate(purchases).map((purchase) => (
                <>
                  <TableRow key={purchase.id}>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpand(purchase.id)}>
                        {expandedId === purchase.id ? <CollapseIcon /> : <ExpandIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{purchase.number}</TableCell>
                    <TableCell>
                      {format(new Date(purchase.date), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell>{purchase.supplier?.name || '-'}</TableCell>
                    <TableCell>{purchase.department?.name || '-'}</TableCell>
                    <TableCell align="right">
                      {parseFloat(purchase.total_amount).toFixed(2)} ₴
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(purchase.status)}
                        color={getStatusColor(purchase.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {purchase.status === 'draft' && isAdmin() && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleConfirm(purchase.id)}
                        >
                          Підтвердити
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0 }}>
                      <Collapse in={expandedId === purchase.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Позиції закупівлі:
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Товар</TableCell>
                                <TableCell align="right">Кількість</TableCell>
                                <TableCell align="right">Ціна</TableCell>
                                <TableCell align="right">Сума</TableCell>
                                <TableCell>Примітки</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {purchase.items?.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product?.name || '-'}</TableCell>
                                  <TableCell align="right">{item.quantity}</TableCell>
                                  <TableCell align="right">₴{item.unit_price}</TableCell>
                                  <TableCell align="right">₴{item.total_price}</TableCell>
                                  <TableCell>{item.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {purchase.notes && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Примітки:</strong> {purchase.notes}
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
          count={purchases.length}
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

export default PurchasesList
