import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Tabs, Tab, Grid, Card, CardContent,
  TextField, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Alert, Collapse, IconButton, Autocomplete,
} from '@mui/material'
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { reportsAPI } from '../../api/reports'
import { productsAPI } from '../../api/products'

const COLORS = ['#2e7d32', '#1565c0', '#c62828', '#e65100', '#6a1b9a', '#00838f', '#4e342e']
const ABC_CHIP = { A: 'error', B: 'warning', C: 'success' }

const today = new Date()
const isoToday = today.toISOString().split('T')[0]
const isoYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
const isoMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

const fmtDay = (d) => {
  try { return format(new Date(d + 'T00:00:00'), 'dd.MM.yy') } catch { return d }
}
const fmtMoney = (v) =>
  parseFloat(v || 0).toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const AnalyticsPage = () => {
  const [tab, setTab] = useState(0)
  const [products, setProducts] = useState([])

  // Tab 1 — Price dynamics
  const [selProduct, setSelProduct] = useState(null)
  const [priceFrom, setPriceFrom] = useState(isoYearAgo)
  const [priceTo, setPriceTo] = useState(isoToday)
  const [priceData, setPriceData] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)

  // Tab 2 — Supplier monthly
  const [suppFrom, setSuppFrom] = useState(isoMonthStart)
  const [suppTo, setSuppTo] = useState(isoToday)
  const [suppData, setSuppData] = useState(null)
  const [suppLoading, setSuppLoading] = useState(false)
  const [expandedSupp, setExpandedSupp] = useState(null)

  // Tab 3 — ABC
  const [abcFrom, setAbcFrom] = useState(isoYearAgo)
  const [abcTo, setAbcTo] = useState(isoToday)
  const [abcData, setAbcData] = useState(null)
  const [abcLoading, setAbcLoading] = useState(false)

  useEffect(() => {
    productsAPI.list().then(setProducts).catch(() => {})
  }, [])

  const loadPrice = async () => {
    if (!selProduct) return
    try {
      setPriceLoading(true)
      const data = await reportsAPI.getPriceDynamics({ product_id: selProduct.id, date_from: priceFrom, date_to: priceTo })
      setPriceData(data)
    } catch (err) {
      alert('Помилка: ' + err.message)
    } finally {
      setPriceLoading(false)
    }
  }

  const loadSupplier = async () => {
    try {
      setSuppLoading(true)
      const data = await reportsAPI.getSupplierMonthly({ date_from: suppFrom, date_to: suppTo })
      setSuppData(data)
    } catch (err) {
      alert('Помилка: ' + err.message)
    } finally {
      setSuppLoading(false)
    }
  }

  const loadABC = async () => {
    try {
      setAbcLoading(true)
      const data = await reportsAPI.getABCAnalysis({ date_from: abcFrom, date_to: abcTo })
      setAbcData(data)
    } catch (err) {
      alert('Помилка: ' + err.message)
    } finally {
      setAbcLoading(false)
    }
  }

  // Build chart data: pivot by date, one column per supplier
  const buildPriceChart = () => {
    if (!priceData?.points?.length) return { chartData: [], suppliers: [] }
    const pts = priceData.points
    const suppliers = [...new Set(pts.map(p => p.supplier_name))]
    const dates = [...new Set(pts.map(p => p.date))].sort()
    const chartData = dates.map(date => {
      const obj = { date: fmtDay(date) }
      suppliers.forEach(s => {
        const match = pts.filter(p => p.date === date && p.supplier_name === s)
        if (match.length) obj[s] = parseFloat(match[match.length - 1].unit_price)
      })
      return obj
    })
    return { chartData, suppliers }
  }

  const { chartData, suppliers } = buildPriceChart()

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Аналітика</Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Динаміка цін" />
          <Tab label="По постачальниках" />
          <Tab label="ABC-аналіз" />
        </Tabs>
      </Paper>

      {/* ── Tab 1: Price Dynamics ── */}
      {tab === 0 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  options={products}
                  getOptionLabel={(opt) => opt.name || ''}
                  value={selProduct}
                  onChange={(_, v) => { setSelProduct(v); setPriceData(null) }}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  renderInput={(params) => <TextField {...params} label="Товар" size="small" />}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField fullWidth size="small" type="date" label="Від" value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField fullWidth size="small" type="date" label="До" value={priceTo}
                  onChange={(e) => setPriceTo(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button fullWidth variant="contained" onClick={loadPrice}
                  disabled={!selProduct || priceLoading}>
                  {priceLoading ? 'Завантаження...' : 'Показати'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {priceData && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {priceData.product_name}{priceData.unit_name ? ` (${priceData.unit_name})` : ''}
              </Typography>
              {chartData.length === 0 ? (
                <Alert severity="info">Немає підтверджених закупівель за обраний період</Alert>
              ) : (
                <ResponsiveContainer width="99%" height={340}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }} width={80}
                      tickFormatter={(v) => `${parseFloat(v).toLocaleString('uk-UA')} ₴`}
                    />
                    <Tooltip
                      formatter={(v, name) => [`${parseFloat(v).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴`, name]}
                    />
                    <Legend />
                    {suppliers.map((s, i) => (
                      <Line key={s} type="monotone" dataKey={s}
                        stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                        dot={{ r: 5 }} connectNulls={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Paper>
          )}
        </Box>
      )}

      {/* ── Tab 2: Supplier Monthly ── */}
      {tab === 1 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="date" label="Від" value={suppFrom}
                  onChange={(e) => setSuppFrom(e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="date" label="До" value={suppTo}
                  onChange={(e) => setSuppTo(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button fullWidth variant="contained" onClick={loadSupplier} disabled={suppLoading}>
                  {suppLoading ? 'Завантаження...' : 'Показати'}
                </Button>
              </Grid>
              {suppData && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Всього: <strong>{fmtMoney(suppData.total_amount)} ₴</strong>
                    {' | '}Постачальників: <strong>{suppData.suppliers.length}</strong>
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {suppData && (
            suppData.suppliers.length === 0 ? (
              <Alert severity="info">Немає підтверджених закупівель за обраний період</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width={48} />
                      <TableCell>Постачальник</TableCell>
                      <TableCell align="center">Закупівель</TableCell>
                      <TableCell align="right">Сума</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {suppData.suppliers.map((s) => (
                      <>
                        <TableRow key={s.supplier_id} hover sx={{ cursor: 'pointer' }}
                          onClick={() => setExpandedSupp(expandedSupp === s.supplier_id ? null : s.supplier_id)}>
                          <TableCell>
                            <IconButton size="small">
                              {expandedSupp === s.supplier_id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell><strong>{s.supplier_name}</strong></TableCell>
                          <TableCell align="center">{s.purchases_count}</TableCell>
                          <TableCell align="right"><strong>{fmtMoney(s.total_amount)} ₴</strong></TableCell>
                        </TableRow>

                        <TableRow key={`${s.supplier_id}-exp`}>
                          <TableCell colSpan={4} sx={{ p: 0, borderBottom: 0 }}>
                            <Collapse in={expandedSupp === s.supplier_id} unmountOnExit>
                              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Дата</TableCell>
                                      <TableCell>Накладна</TableCell>
                                      <TableCell>Товар</TableCell>
                                      <TableCell align="right">К-сть</TableCell>
                                      <TableCell align="right">Ціна</TableCell>
                                      <TableCell align="right">Сума</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {s.items.map((item, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDay(item.date)}</TableCell>
                                        <TableCell sx={{ fontSize: 12 }}>{item.purchase_number}</TableCell>
                                        <TableCell>{item.product_name}</TableCell>
                                        <TableCell align="right">{parseFloat(item.quantity).toFixed(2)}</TableCell>
                                        <TableCell align="right">{parseFloat(item.unit_price).toFixed(2)} ₴</TableCell>
                                        <TableCell align="right">{parseFloat(item.total_price).toFixed(2)} ₴</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}
        </Box>
      )}

      {/* ── Tab 3: ABC Analysis ── */}
      {tab === 2 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="date" label="Від" value={abcFrom}
                  onChange={(e) => setAbcFrom(e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="date" label="До" value={abcTo}
                  onChange={(e) => setAbcTo(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button fullWidth variant="contained" onClick={loadABC} disabled={abcLoading}>
                  {abcLoading ? 'Завантаження...' : 'Показати'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {abcData && abcData.items.length === 0 && (
            <Alert severity="info">Немає підтверджених закупівель за обраний період</Alert>
          )}

          {abcData && abcData.items.length > 0 && (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {[
                  { cls: 'a', label: 'Група A — пріоритетні', color: '#c62828', hint: 'Топ 80% витрат. Максимальний контроль цін.' },
                  { cls: 'b', label: 'Група B — важливі', color: '#e65100', hint: 'Наступні 15% витрат. Регулярний моніторинг.' },
                  { cls: 'c', label: 'Група C — другорядні', color: '#2e7d32', hint: 'Залишок 5% витрат. Стандартний контроль.' },
                ].map(({ cls, label, color, hint }) => (
                  <Grid item xs={12} sm={4} key={cls}>
                    <Card sx={{ borderLeft: `4px solid ${color}` }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {fmtMoney(abcData[`amount_${cls}`])} ₴
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {abcData[`count_${cls}`]} товарів — {hint}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={40}>#</TableCell>
                      <TableCell>Товар</TableCell>
                      <TableCell>Категорія</TableCell>
                      <TableCell align="right">Сума закупівель</TableCell>
                      <TableCell align="right">%</TableCell>
                      <TableCell align="right">Накоп. %</TableCell>
                      <TableCell align="center">Клас</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {abcData.items.map((item, idx) => (
                      <TableRow key={item.product_id}
                        sx={{
                          bgcolor: item.abc_class === 'A' ? '#fff5f5' : item.abc_class === 'B' ? '#fff8f0' : 'inherit',
                        }}
                      >
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{item.category_name || '—'}</TableCell>
                        <TableCell align="right">{fmtMoney(item.total_amount)} ₴</TableCell>
                        <TableCell align="right">{parseFloat(item.percentage).toFixed(1)}%</TableCell>
                        <TableCell align="right">{parseFloat(item.cumulative_percentage).toFixed(1)}%</TableCell>
                        <TableCell align="center">
                          <Chip label={item.abc_class} color={ABC_CHIP[item.abc_class]} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}

export default AnalyticsPage
