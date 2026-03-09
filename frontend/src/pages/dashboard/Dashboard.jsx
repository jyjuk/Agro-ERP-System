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
  ElectricBolt as ElectricBoltIcon,
  LocalFireDepartment as GasIcon,
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
import { electricityAPI } from '../../api/electricity'
import { gasAPI } from '../../api/gas'

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
  const [electricityData, setElectricityData] = useState([])
  const [gasData, setGasData] = useState([])
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

  const MONTHS_UK = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [dashboardData, lowStock, purchases, transfers, elecResult, gasResult] = await Promise.allSettled([
        reportsAPI.getDashboard(),
        inventoryAPI.getLowStock(),
        purchasesAPI.list({ limit: 5 }),
        transfersAPI.list({ limit: 5 }),
        electricityAPI.listMonths(),
        gasAPI.listMonths(),
      ])
      if (dashboardData.status === 'fulfilled') setData(dashboardData.value)
      else throw new Error(dashboardData.reason?.message || 'Failed to load dashboard')
      if (lowStock.status === 'fulfilled') setLowStockItems(lowStock.value)
      if (purchases.status === 'fulfilled') setRecentPurchases(purchases.value.slice(0, 5))
      if (transfers.status === 'fulfilled') setRecentTransfers(transfers.value.slice(0, 5))
      if (elecResult.status === 'fulfilled') {
        const last6 = [...elecResult.value]
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-6)
          .map(r => {
            const [y, mo] = r.month.split('-')
            return {
              name: `${MONTHS_UK[parseInt(mo) - 1]}'${y.slice(2)}`,
              'Млин': Math.round(r.mlyn_total),
              'Пелетний': Math.round(r.palet_kwh),
              'Елеватор': Math.round(r.elevator_kwh),
            }
          })
        setElectricityData(last6)
      }
      if (gasResult.status === 'fulfilled') {
        const last6 = [...gasResult.value]
          .filter(r => r.consumption != null || r.vtv != null)
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-6)
          .map(r => {
            const [y, mo] = r.month.split('-')
            return {
              name: `${MONTHS_UK[parseInt(mo) - 1]}'${y.slice(2)}`,
              'Споживання': r.consumption != null ? Math.round(r.consumption) : null,
              ...(r.vtv != null ? { 'ВТВ': parseFloat(Number(r.vtv).toFixed(2)) } : {}),
            }
          })
        setGasData(last6)
      }
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
  // Convert Decimal strings → numbers so Recharts renders correctly
  const monthlyPurchases = (data?.monthly_purchases || []).map(d => ({
    ...d,
    total_amount: parseFloat(d.total_amount) || 0,
  }))
  const maxAmount = Math.max(0, ...monthlyPurchases.map(d => d.total_amount))
  const topSuppliers = (data?.top_suppliers || []).map(d => ({
    ...d,
    total_purchases: parseFloat(d.total_purchases) || 0,
  }))
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
            <ResponsiveContainer width="99%" height={300}>
              <LineChart data={monthlyPurchases} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_name" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  width={75}
                  domain={[0, Math.ceil(maxAmount * 1.3) || 100]}
                />
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
                <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 'dataMax']} />
                <YAxis dataKey="supplier_name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${parseFloat(v).toLocaleString('uk-UA')} ₴`} />
                <Bar dataKey="total_purchases" fill="#66bb6a" name="Сума (₴)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Energy charts row */}
      {(electricityData.length > 0 || gasData.length > 0) && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {electricityData.length > 0 && (
            <Grid item xs={12} lg={gasData.length > 0 ? 7 : 12}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <ElectricBoltIcon color="warning" fontSize="small" />
                  <Typography variant="h6">Електроенергія — останні місяці</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>кВт·год</Typography>
                </Box>
                <ResponsiveContainer width="99%" height={220}>
                  <BarChart data={electricityData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 12 }} width={40} />
                    <Tooltip formatter={(v, name) => [`${Number(v).toLocaleString('uk-UA')} кВт·год`, name]} />
                    <Legend />
                    <Bar dataKey="Млин" stackId="a" fill="#1976d2" />
                    <Bar dataKey="Пелетний" stackId="a" fill="#e65100" />
                    <Bar dataKey="Елеватор" stackId="a" fill="#2e7d32" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}
          {gasData.length > 0 && (
            <Grid item xs={12} lg={electricityData.length > 0 ? 5 : 12}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <GasIcon color="primary" fontSize="small" />
                  <Typography variant="h6">Газ — останні місяці</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>м³</Typography>
                </Box>
                <ResponsiveContainer width="99%" height={220}>
                  <BarChart data={gasData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} tick={{ fontSize: 12 }} width={40} />
                    <Tooltip formatter={(v, name) => v != null ? [`${Number(v).toLocaleString('uk-UA')} м³`, name] : ['—', name]} />
                    <Legend />
                    <Bar dataKey="Споживання" fill="#1565c0" radius={[3, 3, 0, 0]} />
                    {gasData.some(d => d['ВТВ'] != null) && (
                      <Bar dataKey="ВТВ" fill="#e65100" radius={[3, 3, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

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
