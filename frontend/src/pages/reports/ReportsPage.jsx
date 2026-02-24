import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Grid,
  MenuItem,
  Stack,
  Divider,
} from '@mui/material'
import {
  FilterList as FilterIcon,
  FileDownload as DownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { reportsAPI } from '../../api/reports'
import { suppliersAPI } from '../../api/suppliers'
import { departmentsAPI } from '../../api/departments'
import { productsAPI } from '../../api/products'

// Фільтри, що відображаються для кожної вкладки
const TAB_FILTERS = {
  0: ['date', 'supplier', 'category', 'product'], // Закупівлі
  1: ['date', 'department', 'category'],           // Аналіз витрат
  2: ['date', 'supplier'],                         // Постачальники
  3: ['date', 'department'],                       // Підрозділи
  4: ['date', 'category', 'department', 'product'], // Матеріали
}

const TAB_LABELS = ['Закупівлі', 'Аналіз витрат', 'Постачальники', 'Підрозділи', 'Матеріали']

const fmt = (val, decimals = 2) => parseFloat(val || 0).toFixed(decimals)
const fmtDate = (d) => {
  if (!d) return '—'
  try { return format(new Date(d), 'dd.MM.yyyy') } catch { return '—' }
}

const ReportsPage = () => {
  const [tab, setTab] = useState(0)
  const [purchaseReport, setPurchaseReport] = useState(null)
  const [costAnalysis, setCostAnalysis] = useState(null)
  const [supplierReport, setSupplierReport] = useState(null)
  const [departmentReport, setDepartmentReport] = useState(null)
  const [materialReport, setMaterialReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Стан фільтрів
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterProduct, setFilterProduct] = useState('')

  // Дані для dropdown фільтрів
  const [suppliers, setSuppliers] = useState([])
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])

  const showFilter = (name) => TAB_FILTERS[tab]?.includes(name)

  useEffect(() => {
    loadFiltersData()
    loadReports()
  }, [])

  const loadFiltersData = async () => {
    try {
      const [s, d, c] = await Promise.all([
        suppliersAPI.list(),
        departmentsAPI.list(),
        productsAPI.getCategories(),
      ])
      setSuppliers(s)
      setDepartments(d)
      setCategories(c)
    } catch (err) {
      console.error('Помилка завантаження даних фільтрів:', err)
    }
  }

  // f - явно передані значення фільтрів (для handleClearFilters)
  const loadReports = async (f = null) => {
    const filters = f || { dateFrom, dateTo, filterSupplier, filterDepartment, filterCategory }
    try {
      setLoading(true)
      setError(null)

      const dateParams = {}
      if (filters.dateFrom) dateParams.date_from = filters.dateFrom
      if (filters.dateTo) dateParams.date_to = filters.dateTo

      const purchaseParams = { ...dateParams }
      if (filters.filterSupplier) purchaseParams.supplier_id = filters.filterSupplier
      if (filters.filterCategory) purchaseParams.category_id = filters.filterCategory

      const costParams = { ...dateParams }
      if (filters.filterDepartment) costParams.department_id = filters.filterDepartment
      if (filters.filterCategory) costParams.category_id = filters.filterCategory

      const supplierParams = { ...dateParams }
      if (filters.filterSupplier) supplierParams.supplier_id = filters.filterSupplier

      const departmentParams = { ...dateParams }
      if (filters.filterDepartment) departmentParams.department_id = filters.filterDepartment

      const materialParams = { ...dateParams }
      if (filters.filterCategory) materialParams.category_id = filters.filterCategory
      if (filters.filterDepartment) materialParams.department_id = filters.filterDepartment

      const [purchase, cost, supplier, department, material] = await Promise.all([
        reportsAPI.getPurchaseReport(purchaseParams),
        reportsAPI.getCostAnalysis(costParams),
        reportsAPI.getSupplierReport(supplierParams),
        reportsAPI.getDepartmentReport(departmentParams),
        reportsAPI.getMaterialReport(materialParams),
      ])
      setPurchaseReport(purchase)
      setCostAnalysis(cost)
      setSupplierReport(supplier)
      setDepartmentReport(department)
      setMaterialReport(material)
    } catch (err) {
      setError(err.message || 'Помилка завантаження звітів')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => loadReports()

  const handleClearFilters = () => {
    const cleared = {
      dateFrom: '', dateTo: '',
      filterSupplier: '', filterDepartment: '', filterCategory: '',
    }
    setDateFrom('')
    setDateTo('')
    setFilterSupplier('')
    setFilterDepartment('')
    setFilterCategory('')
    setFilterProduct('')
    loadReports(cleared)
  }

  // ===== ЕКСПОРТ =====

  const exportExcel = (filename, sheets) => {
    const wb = XLSX.utils.book_new()
    sheets.forEach(({ name, headers, rows }) => {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const colWidths = headers.map((h, i) => ({
        wch: Math.max(h.length + 2, ...rows.map(r => String(r[i] ?? '').length + 1))
      }))
      ws['!cols'] = colWidths
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
    })
    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`)
  }

  // Друкує одну або кілька таблиць в одному вікні
  const printSheets = (title, sheets) => {
    const style = `
      body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
      h2{font-size:15px;margin-bottom:4px}
      h3{font-size:12px;margin:18px 0 6px;color:#333}
      p{font-size:10px;color:#777;margin-bottom:12px}
      table{border-collapse:collapse;width:100%;margin-bottom:16px}
      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#e8e8e8;font-weight:bold}
      tr:nth-child(even){background:#f9f9f9}
      @media print{@page{margin:1cm}}`
    const tablesHTML = sheets.map(({ name, headers, rows }) => {
      const tHead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`
      const tBody = rows.map(row =>
        `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`
      ).join('')
      const subtitle = sheets.length > 1 ? `<h3>${name}</h3>` : ''
      return `${subtitle}<table><thead>${tHead}</thead><tbody>${tBody}</tbody></table>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${title}</title><style>${style}</style></head><body>
    <h2>${title}</h2>
    <p>Дата: ${format(new Date(), 'dd.MM.yyyy')}</p>
    ${tablesHTML}
    <script>window.onload=function(){window.print()}<\/script>
    </body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  // Формування даних для експорту залежно від поточної вкладки
  const getExportData = () => {
    switch (tab) {
      case 0: {
        const items = filteredPurchaseItems
        return {
          filename: 'zakupivli',
          sheets: [{
            name: 'Закупівлі',
            headers: ['Номер', 'Дата', 'Постачальник', 'Товар', 'Категорія', 'Кількість', 'Ціна (₴)', 'Сума (₴)'],
            rows: items.map(i => [
              i.purchase_number,
              fmtDate(i.purchase_date),
              i.supplier_name,
              i.product_name,
              i.category_name || '—',
              fmt(i.quantity),
              fmt(i.unit_price),
              fmt(i.total_price),
            ])
          }]
        }
      }
      case 1: {
        return {
          filename: 'analiz_vytrat',
          sheets: [
            {
              name: 'По категоріях',
              headers: ['Категорія', 'Сума (₴)', 'Частка (%)'],
              rows: (costAnalysis?.category_breakdown || []).map(c => [
                c.category_name,
                fmt(c.total_cost),
                fmt(c.percentage, 1),
              ])
            },
            {
              name: 'По матеріалах',
              headers: ['Матеріал', 'Код', 'Категорія', 'Одиниця', 'Закуплено к-сть', 'Закуплено (₴)', 'Списано к-сть', 'Списано (₴)'],
              rows: (costAnalysis?.product_breakdown || []).map(p => [
                p.product_name,
                p.product_code,
                p.category_name || '—',
                p.unit_name || '',
                fmt(p.purchased_quantity),
                fmt(p.purchased_value),
                fmt(p.writeoff_quantity),
                fmt(p.writeoff_value),
              ])
            },
            {
              name: 'По підрозділах',
              headers: ['Підрозділ', 'Матеріал', 'Категорія', 'Одиниця', 'Закуплено к-сть', 'Закуплено (₴)', 'Списано к-сть', 'Списано (₴)'],
              rows: (() => {
                const rows = []
                ;(costAnalysis?.department_breakdown || []).forEach(d => {
                  rows.push([`▶ ${d.department_name}`, `Залишки: ${fmt(d.inventory_value)} ₴`, `Отримано: ${fmt(d.transfers_received)} ₴`, `Відправлено: ${fmt(d.transfers_sent)} ₴`, `Списано: ${fmt(d.writeoffs_value)} ₴`, '', '', ''])
                  ;(d.materials || []).forEach(m => {
                    rows.push(['', m.product_name, m.category_name || '—', m.unit_name || '', fmt(m.purchased_quantity), fmt(m.purchased_value), fmt(m.writeoff_quantity), fmt(m.writeoff_value)])
                  })
                })
                return rows
              })()
            }
          ]
        }
      }
      case 2: {
        const headers = ['Постачальник', 'Товар', 'Категорія', 'Одиниця', 'Кількість', 'Сума (₴)', 'Закупівель']
        const rows = []
        ;(supplierReport?.suppliers || []).forEach(s => {
          rows.push([`▶ ${s.supplier_name}`, `Всього: ${fmt(s.total_purchases)} ₴`, '', '', '', fmt(s.total_purchases), s.purchase_count])
          s.products.forEach(p => {
            rows.push(['', p.product_name, p.category_name || '—', p.unit_name || '', fmt(p.total_quantity), fmt(p.total_amount), p.purchase_count])
          })
        })
        return { filename: 'postachalnyky', sheets: [{ name: 'Постачальники', headers, rows }] }
      }
      case 3: {
        const headers = ['Підрозділ', 'Матеріал', 'Категорія', 'Одиниця', 'Отримано к-сть', 'Отримано (₴)', 'Списано к-сть', 'Списано (₴)', 'Переміщено к-сть', 'Переміщено (₴)', 'Залишок', 'Залишок (₴)']
        const rows = []
        ;(departmentReport?.departments || []).forEach(d => {
          rows.push([`▶ ${d.department_name}`, `Залишки: ${fmt(d.total_stock_value)} ₴`, `Отримано: ${fmt(d.total_received_value)} ₴`, `Списано: ${fmt(d.total_writeoff_value)} ₴`, `Переміщено: ${fmt(d.total_transferred_value)} ₴`, '', '', '', '', '', '', ''])
          d.materials.forEach(m => {
            rows.push(['', m.product_name, m.category_name || '—', m.unit_name || '', fmt(m.received_quantity), fmt(m.received_value), fmt(m.writeoff_quantity), fmt(m.writeoff_value), fmt(m.transferred_quantity), fmt(m.transferred_value), fmt(m.current_stock), fmt(m.current_value)])
          })
        })
        return { filename: 'pidrozdily', sheets: [{ name: 'Підрозділи', headers, rows }] }
      }
      case 4: {
        return {
          filename: 'materialy',
          sheets: [{
            name: 'Матеріали',
            headers: ['Товар', 'Код', 'Категорія', 'Одиниця', 'Закуплено к-сть', 'Закуплено (₴)', 'Списано к-сть', 'Списано (₴)', 'Залишок к-сть', 'Залишок (₴)', 'Розташування по підрозділах'],
            rows: filteredMaterialItems.map(m => [
              m.product_name,
              m.product_code,
              m.category_name || '—',
              m.unit_name,
              fmt(m.purchased_quantity),
              fmt(m.purchased_value),
              fmt(m.writeoff_quantity),
              fmt(m.writeoff_value),
              fmt(m.current_stock_quantity),
              fmt(m.current_stock_value),
              (m.locations || []).map(l => `${l.department_name}: ${fmt(l.quantity)} ${m.unit_name}`).join(' | ') || '—',
            ])
          }]
        }
      }
      default: return null
    }
  }

  const handleExportExcel = () => {
    const data = getExportData()
    if (data) exportExcel(data.filename, data.sheets)
  }

  const handlePrintPDF = () => {
    const data = getExportData()
    if (!data) return
    printSheets(TAB_LABELS[tab], data.sheets)
  }

  // Локальна фільтрація по тексту товару
  const filteredPurchaseItems = (purchaseReport?.items || []).filter(item =>
    !filterProduct || item.product_name.toLowerCase().includes(filterProduct.toLowerCase())
  )

  const filteredMaterialItems = (materialReport?.materials || []).filter(item =>
    !filterProduct || item.product_name.toLowerCase().includes(filterProduct.toLowerCase())
  )

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Звіти</Typography>

      {/* Панель фільтрів */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Фільтри — {TAB_LABELS[tab]}
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {showFilter('date') && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth label="Дата від" type="date" value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }} size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth label="Дата до" type="date" value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }} size="small"
                />
              </Grid>
            </>
          )}
          {showFilter('supplier') && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth select label="Постачальник" value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)} size="small"
              >
                <MenuItem value="">Всі постачальники</MenuItem>
                {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {showFilter('department') && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth select label="Підрозділ" value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)} size="small"
              >
                <MenuItem value="">Всі підрозділи</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {showFilter('category') && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth select label="Категорія" value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)} size="small"
              >
                <MenuItem value="">Всі категорії</MenuItem>
                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {showFilter('product') && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Пошук товару" value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                size="small" placeholder="Назва товару..."
              />
            </Grid>
          )}
        </Grid>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={handleApplyFilters} startIcon={<FilterIcon />}>
            Застосувати
          </Button>
          <Button variant="outlined" onClick={handleClearFilters}>
            Очистити
          </Button>
        </Stack>
      </Paper>

      {/* Вкладки */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TAB_LABELS.map((label, i) => <Tab key={i} label={label} />)}
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Кнопки експорту */}
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportExcel}
          disabled={loading}>
          Експорт Excel
        </Button>
        <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintPDF}
          disabled={loading}>
          Друк / PDF
        </Button>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Вкладка 0: Закупівлі */}
      {!loading && tab === 0 && purchaseReport && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Звіт по закупівлях</Typography>
          <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Typography>Загальна сума: <strong>{fmt(purchaseReport.total_amount)} ₴</strong></Typography>
            <Typography>Закупівель: <strong>{purchaseReport.total_purchases}</strong></Typography>
            <Typography>Позицій: <strong>{purchaseReport.total_items}</strong></Typography>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Номер</TableCell>
                  <TableCell>Дата</TableCell>
                  <TableCell>Постачальник</TableCell>
                  <TableCell>Товар</TableCell>
                  <TableCell>Категорія</TableCell>
                  <TableCell align="right">Кількість</TableCell>
                  <TableCell align="right">Ціна</TableCell>
                  <TableCell align="right">Сума</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchaseItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.purchase_number}</TableCell>
                    <TableCell>{fmtDate(item.purchase_date)}</TableCell>
                    <TableCell>{item.supplier_name}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.category_name || '—'}</TableCell>
                    <TableCell align="right">{fmt(item.quantity)}</TableCell>
                    <TableCell align="right">{fmt(item.unit_price)} ₴</TableCell>
                    <TableCell align="right">{fmt(item.total_price)} ₴</TableCell>
                  </TableRow>
                ))}
                {filteredPurchaseItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">Немає даних</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Вкладка 1: Аналіз витрат */}
      {!loading && tab === 1 && costAnalysis && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Аналіз витрат</Typography>
          <Stack direction="row" spacing={3} sx={{ mb: 3, flexWrap: 'wrap' }}>
            <Typography>Закупівлі: <strong>{fmt(costAnalysis.total_purchases)} ₴</strong></Typography>
            <Typography>Переміщення: <strong>{fmt(costAnalysis.total_transfers)} ₴</strong></Typography>
            <Typography>Списано: <strong>{fmt(costAnalysis.total_writeoffs)} ₴</strong></Typography>
          </Stack>

          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>По категоріях</Typography>
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Категорія</TableCell>
                  <TableCell align="right">Сума</TableCell>
                  <TableCell align="right">Частка</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(costAnalysis.category_breakdown || []).map((cat) => (
                  <TableRow key={cat.category_id ?? cat.category_name}>
                    <TableCell>{cat.category_name}</TableCell>
                    <TableCell align="right">{fmt(cat.total_cost)} ₴</TableCell>
                    <TableCell align="right">{fmt(cat.percentage, 1)}%</TableCell>
                  </TableRow>
                ))}
                {(costAnalysis.category_breakdown || []).length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center">Немає даних</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>По матеріалах</Typography>
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Матеріал</TableCell>
                  <TableCell>Категорія</TableCell>
                  <TableCell align="right">Закуплено к-сть</TableCell>
                  <TableCell align="right">Закуплено (₴)</TableCell>
                  <TableCell align="right">Списано к-сть</TableCell>
                  <TableCell align="right">Списано (₴)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(costAnalysis.product_breakdown || []).map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell>
                      {p.product_name}
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{p.product_code}</Typography>
                    </TableCell>
                    <TableCell>{p.category_name || '—'}</TableCell>
                    <TableCell align="right">{fmt(p.purchased_quantity)} {p.unit_name || ''}</TableCell>
                    <TableCell align="right"><strong>{fmt(p.purchased_value)} ₴</strong></TableCell>
                    <TableCell align="right">{fmt(p.writeoff_quantity)} {p.unit_name || ''}</TableCell>
                    <TableCell align="right"><strong>{fmt(p.writeoff_value)} ₴</strong></TableCell>
                  </TableRow>
                ))}
                {(costAnalysis.product_breakdown || []).length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">Немає даних</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>По підрозділах</Typography>
          {(costAnalysis.department_breakdown || []).length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>Немає даних</Typography>
          ) : (
            (costAnalysis.department_breakdown || []).map(dept => (
              <Box key={dept.department_id} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 4, p: 1.5, bgcolor: 'grey.100', borderRadius: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography fontWeight={700}>{dept.department_name}</Typography>
                  <Typography variant="body2">Залишки: <strong>{fmt(dept.inventory_value)} ₴</strong></Typography>
                  <Typography variant="body2">Отримано: <strong>{fmt(dept.transfers_received)} ₴</strong></Typography>
                  <Typography variant="body2">Відправлено: <strong>{fmt(dept.transfers_sent)} ₴</strong></Typography>
                  <Typography variant="body2" color="error.main">Списано: <strong>{fmt(dept.writeoffs_value)} ₴</strong></Typography>
                </Box>
                {(dept.materials || []).length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell>Матеріал</TableCell>
                          <TableCell>Категорія</TableCell>
                          <TableCell align="right">Закуплено к-сть</TableCell>
                          <TableCell align="right">Закуплено (₴)</TableCell>
                          <TableCell align="right">Списано к-сть</TableCell>
                          <TableCell align="right">Списано (₴)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dept.materials.map(m => (
                          <TableRow key={m.product_id}>
                            <TableCell>
                              {m.product_name}
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{m.product_code}</Typography>
                            </TableCell>
                            <TableCell>{m.category_name || '—'}</TableCell>
                            <TableCell align="right">{fmt(m.purchased_quantity)} {m.unit_name || ''}</TableCell>
                            <TableCell align="right"><strong>{fmt(m.purchased_value)} ₴</strong></TableCell>
                            <TableCell align="right">{fmt(m.writeoff_quantity)} {m.unit_name || ''}</TableCell>
                            <TableCell align="right"><strong>{fmt(m.writeoff_value)} ₴</strong></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            ))
          )}
        </Paper>
      )}

      {/* Вкладка 2: Постачальники */}
      {!loading && tab === 2 && supplierReport && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Звіт по постачальниках</Typography>
          {(supplierReport.suppliers || []).length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>Немає даних</Typography>
          ) : (
            (supplierReport.suppliers || []).map(s => (
              <Box key={s.supplier_id} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 4, p: 1.5, bgcolor: 'grey.100', borderRadius: 1, mb: 0.5 }}>
                  <Typography fontWeight={700}>{s.supplier_name}</Typography>
                  <Typography variant="body2" color="text.secondary">Закупівель: {s.purchase_count}</Typography>
                  <Typography variant="body2" color="text.secondary">Остання: {fmtDate(s.last_purchase_date)}</Typography>
                  <Typography fontWeight={700} sx={{ ml: 'auto' }}>{fmt(s.total_purchases)} ₴</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>Товар</TableCell>
                        <TableCell>Категорія</TableCell>
                        <TableCell align="right">Кількість</TableCell>
                        <TableCell align="right">Сума</TableCell>
                        <TableCell align="right">Закупівель</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(s.products || []).map(p => (
                        <TableRow key={p.product_id}>
                          <TableCell>
                            {p.product_name}
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{p.product_code}</Typography>
                          </TableCell>
                          <TableCell>{p.category_name || '—'}</TableCell>
                          <TableCell align="right">{fmt(p.total_quantity)} {p.unit_name || ''}</TableCell>
                          <TableCell align="right"><strong>{fmt(p.total_amount)} ₴</strong></TableCell>
                          <TableCell align="right">{p.purchase_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
          )}
        </Paper>
      )}

      {/* Вкладка 3: Підрозділи */}
      {!loading && tab === 3 && departmentReport && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Звіт по підрозділах</Typography>
          {(departmentReport.departments || []).length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>Немає даних</Typography>
          ) : (
            (departmentReport.departments || []).map(d => (
              <Box key={d.department_id} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 4, p: 1.5, bgcolor: 'primary.50', borderRadius: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography fontWeight={700}>{d.department_name}</Typography>
                  <Typography variant="body2">Отримано: <strong>{fmt(d.total_received_value)} ₴</strong></Typography>
                  <Typography variant="body2">Списано: <strong>{fmt(d.total_writeoff_value)} ₴</strong></Typography>
                  <Typography variant="body2">Переміщено: <strong>{fmt(d.total_transferred_value)} ₴</strong></Typography>
                  <Typography variant="body2" sx={{ ml: 'auto' }}>Залишки: <strong>{fmt(d.total_stock_value)} ₴</strong></Typography>
                </Box>
                {d.materials.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 2, py: 1 }}>Немає матеріалів за період</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell>Матеріал</TableCell>
                          <TableCell>Категорія</TableCell>
                          <TableCell align="right">Отримано</TableCell>
                          <TableCell align="right">Сума отримано</TableCell>
                          <TableCell align="right">Списано</TableCell>
                          <TableCell align="right">Сума списано</TableCell>
                          <TableCell align="right">Переміщено</TableCell>
                          <TableCell align="right">Сума переміщено</TableCell>
                          <TableCell align="right">Залишок</TableCell>
                          <TableCell align="right">Вартість залишку</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {d.materials.map(m => (
                          <TableRow key={m.product_id}>
                            <TableCell>
                              {m.product_name}
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{m.product_code}</Typography>
                            </TableCell>
                            <TableCell>{m.category_name || '—'}</TableCell>
                            <TableCell align="right">{fmt(m.received_quantity)} {m.unit_name}</TableCell>
                            <TableCell align="right">{fmt(m.received_value)} ₴</TableCell>
                            <TableCell align="right">{fmt(m.writeoff_quantity)} {m.unit_name}</TableCell>
                            <TableCell align="right">{fmt(m.writeoff_value)} ₴</TableCell>
                            <TableCell align="right">{fmt(m.transferred_quantity)} {m.unit_name}</TableCell>
                            <TableCell align="right">{fmt(m.transferred_value)} ₴</TableCell>
                            <TableCell align="right"><strong>{fmt(m.current_stock)} {m.unit_name}</strong></TableCell>
                            <TableCell align="right"><strong>{fmt(m.current_value)} ₴</strong></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            ))
          )}
        </Paper>
      )}

      {/* Вкладка 4: Матеріали */}
      {!loading && tab === 4 && materialReport && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Звіт по матеріалах</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell>Категорія</TableCell>
                  <TableCell align="right">Закуплено</TableCell>
                  <TableCell align="right">Списано</TableCell>
                  <TableCell align="right">Залишок</TableCell>
                  <TableCell>Розташування</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMaterialItems.map(m => (
                  <TableRow key={m.product_id}>
                    <TableCell>
                      <strong>{m.product_name}</strong>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {m.product_code}
                      </Typography>
                    </TableCell>
                    <TableCell>{m.category_name || '—'}</TableCell>
                    <TableCell align="right">
                      {fmt(m.purchased_quantity)} {m.unit_name}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {fmt(m.purchased_value)} ₴
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {fmt(m.writeoff_quantity)} {m.unit_name}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {fmt(m.writeoff_value)} ₴
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{fmt(m.current_stock_quantity)} {m.unit_name}</strong>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {fmt(m.current_stock_value)} ₴
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {(m.locations || []).map((loc, i) => (
                        <Typography key={i} variant="caption" display="block">
                          {loc.department_name}: {fmt(loc.quantity)} {m.unit_name}
                        </Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMaterialItems.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">Немає даних</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}

export default ReportsPage
