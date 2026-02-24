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
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
} from '@mui/material'
import { inventoryAPI } from '../../api/inventory'
import { usePagination } from '../../hooks/usePagination'

const InventoryPage = () => {
  const [inventory, setInventory] = useState([])
  const [values, setValues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate, reset } = usePagination(50)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [invData, valData] = await Promise.all([
        inventoryAPI.list(),
        inventoryAPI.getValues(),
      ])
      setInventory(invData)
      setValues(valData)
    } catch (err) {
      setError(err.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  // Filter values
  const filteredValues = values.filter((item) => {
    const matchesDepartment = !filterDepartment || item.department_name === filterDepartment
    const matchesProduct = !filterProduct || item.product_name.toLowerCase().includes(filterProduct.toLowerCase())
    return matchesDepartment && matchesProduct
  })

  // Get unique departments and products for filters
  const departments = [...new Set(values.map((item) => item.department_name))]
  const products = [...new Set(values.map((item) => item.product_name))]

  // Group by department (using filtered values)
  const byDepartment = filteredValues.reduce((acc, item) => {
    const dept = item.department_name
    if (!acc[dept]) {
      acc[dept] = { items: [], totalValue: 0 }
    }
    acc[dept].items.push(item)
    acc[dept].totalValue += parseFloat(item.total_value)
    return acc
  }, {})

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Залишки на складах
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              select
              label="Підрозділ"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              size="small"
            >
              <MenuItem value="">Всі підрозділи</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Пошук товару"
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              size="small"
              placeholder="Введіть назву товару..."
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(byDepartment).map(([dept, data]) => (
          <Grid item xs={12} sm={6} md={4} key={dept}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {dept}
                </Typography>
                <Typography variant="h5">
                  {data.totalValue.toFixed(2)} ₴
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Позицій: {data.items.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Товар</TableCell>
              <TableCell>Підрозділ</TableCell>
              <TableCell align="right">Кількість</TableCell>
              <TableCell align="right">Середня ціна</TableCell>
              <TableCell align="right">Загальна вартість</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredValues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {values.length === 0 ? 'Немає залишків' : 'Не знайдено залишків за заданими фільтрами'}
                </TableCell>
              </TableRow>
            ) : (
              paginate(filteredValues).map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.department_name}</TableCell>
                  <TableCell align="right">
                    {parseFloat(item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {parseFloat(item.average_cost).toFixed(2)} ₴
                  </TableCell>
                  <TableCell align="right">
                    <strong>{parseFloat(item.total_value).toFixed(2)} ₴</strong>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredValues.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Рядків на сторінці:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} з ${count}`}
        />
      </TableContainer>
    </Box>
  )
}

export default InventoryPage
