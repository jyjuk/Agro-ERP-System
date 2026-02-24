import { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Snackbar,
} from '@mui/material'
import {
  Inventory2 as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  Warning as WarningIcon,
  Business as BusinessIcon,
  Telegram as TelegramIcon,
} from '@mui/icons-material'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { reportsAPI } from '../../api/reports'
import { inventoryAPI } from '../../api/inventory'
import { notificationsAPI } from '../../api/notifications'

const Dashboard = () => {
  const [data, setData] = useState(null)
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notifLoading, setNotifLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleCheckLowStock = async () => {
    try {
      setNotifLoading(true)
      const result = await notificationsAPI.checkLowStock()
      const msg = result.count === 0
        ? 'Низьких залишків немає'
        : result.notified
          ? `Знайдено ${result.count} позицій — сповіщення надіслано в Telegram`
          : `Знайдено ${result.count} позицій (Telegram не налаштований)`
      setSnackbar({ open: true, message: msg, severity: result.count === 0 ? 'success' : 'warning' })
    } catch {
      setSnackbar({ open: true, message: 'Помилка перевірки залишків', severity: 'error' })
    } finally {
      setNotifLoading(false)
    }
  }

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [dashboardData, lowStock] = await Promise.all([
        reportsAPI.getDashboard(),
        inventoryAPI.getLowStock()
      ])
      setData(dashboardData)
      setLowStockItems(lowStock)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )
  }

  const kpis = data?.kpis || {}
  const monthlyPurchases = data?.monthly_purchases || []
  const topSuppliers = data?.top_suppliers || []
  const topProducts = data?.top_products || []

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TelegramIcon />}
          onClick={handleCheckLowStock}
          disabled={notifLoading}
        >
          {notifLoading ? 'Перевірка...' : 'Перевірити залишки → Telegram'}
        </Button>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
      />

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Вартість залишків
                  </Typography>
                  <Typography variant="h5">
                    {parseFloat(kpis.total_inventory_value || 0).toFixed(2)} ₴
                  </Typography>
                </Box>
                <InventoryIcon color="primary" sx={{ fontSize: 48 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Закупівлі за місяць
                  </Typography>
                  <Typography variant="h5">
                    {parseFloat(kpis.purchases_this_month || 0).toFixed(2)} ₴
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Кількість: {kpis.purchases_count_this_month || 0}
                  </Typography>
                </Box>
                <PurchaseIcon color="success" sx={{ fontSize: 48 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Низькі залишки
                  </Typography>
                  <Typography variant="h5">{kpis.low_stock_items_count || 0}</Typography>
                </Box>
                <WarningIcon color="warning" sx={{ fontSize: 48 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Підрозділи
                  </Typography>
                  <Typography variant="h5">{kpis.departments_count || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Товарів: {kpis.products_count || 0}
                  </Typography>
                </Box>
                <BusinessIcon color="info" sx={{ fontSize: 48 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Monthly Purchases Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Закупівлі за останні 6 місяців
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyPurchases}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_amount"
                  stroke="#2e7d32"
                  name="Сума (₴)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Suppliers */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              ТОП-5 Постачальників
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSuppliers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="supplier_name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="total_purchases" fill="#66bb6a" name="Сума (₴)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              ТОП-5 Товарів за витратами
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_cost" fill="#ff6f00" name="Вартість (₴)" />
                <Bar dataKey="quantity_used" fill="#2196f3" name="Кількість" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Товари з низькими залишками
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Товар</TableCell>
                      <TableCell>Підрозділ</TableCell>
                      <TableCell align="right">Залишок</TableCell>
                      <TableCell align="right">Мінімум</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.department_name}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={parseFloat(item.quantity).toFixed(2)}
                            color="warning"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {item.min_stock_level}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {/* Recent Transactions */}
        <Grid item xs={12} lg={lowStockItems.length > 0 ? 6 : 12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Останні транзакції
            </Typography>
            <Box>
              {data?.recent_transactions?.map((trans) => (
                <Box
                  key={trans.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.5,
                    borderBottom: '1px solid #eee',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box>
                    <Typography variant="body1">{trans.product_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {trans.transaction_type} | {trans.department_name}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body1">
                      {parseFloat(trans.quantity).toFixed(2)} од.
                    </Typography>
                    {trans.unit_cost && (
                      <Typography variant="caption" color="text.secondary">
                        {parseFloat(trans.unit_cost).toFixed(2)} ₴
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard
