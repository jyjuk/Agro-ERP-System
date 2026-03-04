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
  Divider,
} from '@mui/material'
import {
  Inventory2 as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  Warning as WarningIcon,
  Business as BusinessIcon,
  Telegram as TelegramIcon,
  SwapHoriz as TransferIcon,
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
import { format } from 'date-fns'
import { reportsAPI } from '../../api/reports'
import { inventoryAPI } from '../../api/inventory'
import { notificationsAPI } from '../../api/notifications'
import { purchasesAPI } from '../../api/purchases'
import { transfersAPI } from '../../api/transfers'

const TRANSACTION_TYPE_UK = {
  receipt: 'Прихід',
  transfer: 'Переміщення',
  writeoff: 'Списання',
  adjustment: 'Коригування',
}

const STATUS_COLOR = {
  draft: 'warning',
  confirmed: 'success',
  cancelled: 'error',
}

const STATUS_UK = {
  draft: 'Чернетка',
  confirmed: 'Підтверджено',
  cancelled: 'Скасовано',
}

const Dashboard = () => {
  const [data, setData] = useState(null)
  const [lowStockItems, setLowStockItems] = useState([])
  const [recentPurchases, setRecentPurchases] = useState([])
  const [recentTransfers, setRecentTransfers] = useState([])
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
      const [dashboardData, lowStock, purchases, transfers] = await Promise.all([
        reportsAPI.getDashboard(),
        inventoryAPI.getLowStock(),
        purchasesAPI.list({ limit: 5 }),
        transfersAPI.list({ limit: 5 }),
      ])
      setData(dashboardData)
      setLowStockItems(lowStock)
      setRecentPurchases(purchases.slice(0, 5))
      setRecentTransfers(transfers.slice(0, 5))
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
    return <Alert severity="error">{error}</Alert>
  }

  const kpis = data?.kpis || {}
  const monthlyPurchases = data?.monthly_purchases || []
  const topSuppliers = data?.top_suppliers || []
  const topProducts = data?.top_products || []

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TelegramIcon />}
          onClick={handleCheckLowStock}
          disabled={notifLoading}
        >
          {notifLoading ? 'Перевірка...' : 'Залишки → Telegram'}
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
      />

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #1976d2' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">Вартість залишків</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {parseFloat(kpis.total_inventory_value || 0).toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₴
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpis.products_count || 0} позицій товарів
                  </Typography>
                </Box>
                <InventoryIcon color="primary" sx={{ fontSize: 44, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #2e7d32' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">Закупівлі за місяць</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {parseFloat(kpis.purchases_this_month || 0).toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₴
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpis.purchases_count_this_month || 0} закупівель
                  </Typography>
                </Box>
                <PurchaseIcon color="success" sx={{ fontSize: 44, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: `4px solid ${kpis.low_stock_items_count > 0 ? '#ed6c02' : '#9e9e9e'}` }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">Низькі залишки</Typography>
                  <Typography variant="h5" fontWeight="bold" color={kpis.low_stock_items_count > 0 ? 'warning.main' : 'text.primary'}>
                    {kpis.low_stock_items_count || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpis.low_stock_items_count > 0 ? 'потребують уваги' : 'все в нормі'}
                  </Typography>
                </Box>
                <WarningIcon color={kpis.low_stock_items_count > 0 ? 'warning' : 'disabled'} sx={{ fontSize: 44, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #0288d1' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">Підрозділи / Товари</Typography>
                  <Typography variant="h5" fontWeight="bold">{kpis.departments_count || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpis.products_count || 0} найменувань
                  </Typography>
                </Box>
                <BusinessIcon color="info" sx={{ fontSize: 44, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Закупівлі за останні 6 місяців</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyPurchases}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${parseFloat(v).toLocaleString('uk-UA')} ₴`} />
                <Legend />
                <Line type="monotone" dataKey="total_amount" stroke="#2e7d32" name="Сума (₴)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>ТОП-5 Постачальників</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topSuppliers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="supplier_name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${parseFloat(v).toLocaleString('uk-UA')} ₴`} />
                <Bar dataKey="total_purchases" fill="#66bb6a" name="Сума (₴)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Tables row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Low stock — always visible */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <WarningIcon color={lowStockItems.length > 0 ? 'warning' : 'disabled'} fontSize="small" />
              <Typography variant="h6">Низькі залишки</Typography>
              {lowStockItems.length > 0 && (
                <Chip label={lowStockItems.length} color="warning" size="small" />
              )}
            </Box>
            {lowStockItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Всі залишки в нормі
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Товар</TableCell>
                      <TableCell>Підрозділ</TableCell>
                      <TableCell align="right">Факт</TableCell>
                      <TableCell align="right">Мін.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockItems.slice(0, 8).map((item, index) => (
                      <TableRow key={index} sx={{ bgcolor: 'warning.50' }}>
                        <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product_name}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.department_name}</TableCell>
                        <TableCell align="right">
                          <Chip label={parseFloat(item.quantity).toFixed(1)} color="warning" size="small" />
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary', fontSize: 13 }}>
                          {item.min_stock_level}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Recent Purchases */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <PurchaseIcon color="success" fontSize="small" />
              <Typography variant="h6">Останні закупівлі</Typography>
            </Box>
            {recentPurchases.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Немає закупівель
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Номер</TableCell>
                      <TableCell>Дата</TableCell>
                      <TableCell>Постачальник</TableCell>
                      <TableCell align="right">Сума</TableCell>
                      <TableCell>Статус</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentPurchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell sx={{ fontSize: 12 }}>{p.number}</TableCell>
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {format(new Date(p.date), 'dd.MM.yy')}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.supplier?.name || '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {parseFloat(p.total_amount).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_UK[p.status] || p.status}
                            color={STATUS_COLOR[p.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Bottom row */}
      <Grid container spacing={2}>
        {/* Recent Transfers */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TransferIcon color="primary" fontSize="small" />
              <Typography variant="h6">Останні переміщення</Typography>
            </Box>
            {recentTransfers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Немає переміщень
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Номер</TableCell>
                      <TableCell>Дата</TableCell>
                      <TableCell>Звідки</TableCell>
                      <TableCell>Куди</TableCell>
                      <TableCell>Статус</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTransfers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell sx={{ fontSize: 12 }}>{t.number}</TableCell>
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {format(new Date(t.date), 'dd.MM.yy')}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.from_department?.name || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.to_department?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_UK[t.status] || t.status}
                            color={STATUS_COLOR[t.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Останні рухи по складу</Typography>
            {(!data?.recent_transactions || data.recent_transactions.length === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Немає транзакцій
              </Typography>
            ) : (
              data.recent_transactions.slice(0, 8).map((trans) => (
                <Box
                  key={trans.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>{trans.product_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {TRANSACTION_TYPE_UK[trans.transaction_type] || trans.transaction_type}
                      {trans.department_name ? ` | ${trans.department_name}` : ''}
                    </Typography>
                  </Box>
                  <Box textAlign="right" sx={{ ml: 1, flexShrink: 0 }}>
                    <Typography variant="body2">
                      {parseFloat(trans.quantity).toFixed(2)} од.
                    </Typography>
                    {trans.unit_cost && (
                      <Typography variant="caption" color="text.secondary">
                        {parseFloat(trans.unit_cost).toFixed(2)} ₴
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard
