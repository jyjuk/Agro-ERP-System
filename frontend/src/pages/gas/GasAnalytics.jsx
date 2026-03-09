import { useState, useMemo, useEffect } from 'react'
import {
  Box, Typography, Paper, Grid, TextField, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  MenuItem, Button, Stack,
} from '@mui/material'
import { FileDownload as DownloadIcon } from '@mui/icons-material'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const MONTHS_UK = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']

const fmtNum  = (v) => v != null ? Number(v).toLocaleString('uk-UA', { maximumFractionDigits: 2 }) : '—'
const fmtInt  = (v) => v != null ? Math.round(v).toLocaleString('uk-UA') : '—'

const monthLabel = (m) => {
  const [y, mo] = m.split('-')
  return `${MONTHS_UK[parseInt(mo) - 1]} ${y}`
}
const shortLabel = (m) => {
  const [y, mo] = m.split('-')
  return `${MONTHS_UK[parseInt(mo) - 1]}'${y.slice(2)}`
}

export default function GasAnalytics({ records }) {
  const years = useMemo(() => {
    const s = new Set(records.map(r => r.month.slice(0, 4)))
    return [...s].sort().reverse()
  }, [records])

  const [yearFilter, setYearFilter]     = useState('')
  const [compareYear1, setCompareYear1] = useState('')
  const [compareYear2, setCompareYear2] = useState('')

  const sortedMonths = useMemo(() =>
    [...records].sort((a, b) => b.month.localeCompare(a.month)), [records])

  const [cmpMonth1, setCmpMonth1] = useState('')
  const [cmpMonth2, setCmpMonth2] = useState('')

  // Ініціалізація стейту після завантаження даних
  useEffect(() => {
    if (!years.length) return
    setYearFilter(prev => prev || years[0])
    setCompareYear1(prev => prev || years[0])
    setCompareYear2(prev => prev || years[1] || years[0])
  }, [years])

  useEffect(() => {
    if (!sortedMonths.length) return
    setCmpMonth2(prev => prev || sortedMonths[0]?.month || '')
    setCmpMonth1(prev => prev || sortedMonths[1]?.month || sortedMonths[0]?.month || '')
  }, [sortedMonths])

  // 1. Динаміка по місяцях
  const dynamicData = useMemo(() =>
    records
      .filter(r => !yearFilter || r.month.startsWith(yearFilter))
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(r => ({
        name:      shortLabel(r.month),
        'Загальне': r.total != null ? Math.round(r.total) : (r.consumption != null ? Math.round(r.consumption) : null),
      })),
    [records, yearFilter]
  )

  // 2. Таблиця по роках
  const tableByYear = useMemo(() => {
    const grouped = {}
    records.forEach(r => {
      const y  = r.month.slice(0, 4)
      const mo = parseInt(r.month.slice(5)) - 1
      if (!grouped[y]) grouped[y] = Array(12).fill(null)
      grouped[y][mo] = r
    })
    return grouped
  }, [records])

  const tableYears = Object.keys(tableByYear).sort()

  const yearTotals = useMemo(() => {
    const t = {}
    tableYears.forEach(y => {
      const rows = tableByYear[y].filter(Boolean)
      t[y] = {
        consumption: rows.reduce((s, r) => s + (r.consumption || 0), 0),
        vtv:         rows.reduce((s, r) => s + (r.vtv || 0), 0),
        total:       rows.reduce((s, r) => s + (r.total || 0), 0),
      }
    })
    return t
  }, [tableByYear, tableYears])

  // 3. MoM порівняння
  const momData = useMemo(() => {
    const r1 = records.find(r => r.month === cmpMonth1)
    const r2 = records.find(r => r.month === cmpMonth2)
    if (!r1 && !r2) return { rows: [], lbl1: '', lbl2: '', r1: null, r2: null }
    const lbl1 = cmpMonth1 ? monthLabel(cmpMonth1) : '—'
    const lbl2 = cmpMonth2 ? monthLabel(cmpMonth2) : '—'
    const val = (r) => r?.total != null ? Math.round(r.total) : (r?.consumption != null ? Math.round(r.consumption) : null)
    const rows = [
      { name: 'Загальне', [lbl1]: val(r1), [lbl2]: val(r2) },
    ]
    return { rows, lbl1, lbl2, r1, r2 }
  }, [records, cmpMonth1, cmpMonth2])

  // 4. YoY
  const yoyTotals = useMemo(() => {
    const sum = (year) => {
      const rows = records.filter(r => r.month.startsWith(year))
      if (!rows.length) return null
      return rows.reduce((s, r) => s + (r.total ?? r.consumption ?? 0), 0)
    }
    return { y1: sum(compareYear1), y2: sum(compareYear2) }
  }, [records, compareYear1, compareYear2])

  const yoyData = useMemo(() =>
    MONTHS_UK.map((mo, i) => {
      const moStr = String(i + 1).padStart(2, '0')
      const r1 = records.find(r => r.month === `${compareYear1}-${moStr}`)
      const r2 = records.find(r => r.month === `${compareYear2}-${moStr}`)
      if (!r1 && !r2) return null
      return {
        name: mo,
        [compareYear1]: r1 ? Math.round(r1.total ?? r1.consumption ?? 0) : null,
        [compareYear2]: r2 ? Math.round(r2.total ?? r2.consumption ?? 0) : null,
      }
    }).filter(Boolean),
    [records, compareYear1, compareYear2]
  )

  // Сезонність — середнє споживання по місяцю за всі роки
  const seasonData = useMemo(() =>
    MONTHS_UK.map((mo, i) => {
      const moStr = String(i + 1).padStart(2, '0')
      const vals = records
        .filter(r => r.month.slice(5) === moStr && r.consumption != null)
        .map(r => r.consumption)
      if (!vals.length) return null
      return {
        name: mo,
        'Середнє': Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      }
    }).filter(Boolean),
    [records]
  )

  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    const headers = ['Місяць', 'Споживання (м³)', 'ВТВ (м³)', 'Всього (м³)']
    const rows = []
    tableYears.forEach(y => {
      tableByYear[y].forEach((r, i) => {
        if (!r) return
        rows.push([
          `${MONTHS_UK[i]} ${y}`,
          r.consumption != null ? r.consumption : '',
          r.vtv         != null ? r.vtv         : '',
          r.total       != null ? r.total        : '',
        ])
      })
      const t = yearTotals[y]
      rows.push([`Разом ${y}`, t.consumption || '', t.vtv || '', t.total || ''])
      rows.push([])
    })
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Газ')
    XLSX.writeFile(wb, `gaz_${format(new Date(), 'dd-MM-yyyy')}.xlsx`)
  }

  if (!records.length) {
    return (
      <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
        Немає даних для аналітики. Введіть показники хоча б за один місяць.
      </Typography>
    )
  }

  const hasVtv = records.some(r => r.vtv != null)

  return (
    <Box>

      {/* 1. Динаміка */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Typography variant="h6">Динаміка споживання газу</Typography>
          <TextField select size="small" value={yearFilter}
            onChange={e => setYearFilter(e.target.value)} sx={{ width: 120, ml: 'auto' }}>
            <MenuItem value="">Всі роки</MenuItem>
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
        </Box>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dynamicData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
            <Tooltip formatter={(v, name) => v != null ? [`${fmtNum(v)} м³`, name] : ['—', name]} />
            <Legend />
            <Bar dataKey="Загальне" fill="#1565c0" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* 2. Помісячна таблиця */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Помісячна таблиця</Typography>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
            onClick={handleExport} sx={{ ml: 'auto' }}>Excel</Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Місяць</TableCell>
                <TableCell align="right">Споживання (м³)</TableCell>
                {hasVtv && <TableCell align="right" sx={{ color: 'warning.dark' }}>ВТВ (м³)</TableCell>}
                <TableCell align="right">Всього (м³)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableYears.map(y => [
                ...tableByYear[y].map((r, i) => r ? (
                  <TableRow key={`${y}-${i}`} hover>
                    <TableCell>{MONTHS_UK[i]} {y}</TableCell>
                    <TableCell align="right">{fmtNum(r.consumption)}</TableCell>
                    {hasVtv && <TableCell align="right" sx={{ color: r.vtv != null ? 'warning.dark' : 'text.disabled' }}>
                      {fmtNum(r.vtv)}
                    </TableCell>}
                    <TableCell align="right" fontWeight={600}>{fmtNum(r.total)}</TableCell>
                  </TableRow>
                ) : null),
                <TableRow key={`total-${y}`} sx={{ bgcolor: 'primary.50' }}>
                  <TableCell><strong>Разом {y}</strong></TableCell>
                  <TableCell align="right"><strong>{fmtInt(yearTotals[y].consumption)}</strong></TableCell>
                  {hasVtv && <TableCell align="right" sx={{ color: 'warning.dark' }}>
                    <strong>{fmtNum(yearTotals[y].vtv)}</strong>
                  </TableCell>}
                  <TableCell align="right"><strong>{fmtInt(yearTotals[y].total)}</strong></TableCell>
                </TableRow>,
              ])}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 3. MoM порівняння */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6">Порівняння місяць до місяця</Typography>
          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            <TextField select size="small" value={cmpMonth1}
              onChange={e => setCmpMonth1(e.target.value)} sx={{ width: 150 }}>
              {sortedMonths.map(r => (
                <MenuItem key={r.month} value={r.month}>{monthLabel(r.month)}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" value={cmpMonth2}
              onChange={e => setCmpMonth2(e.target.value)} sx={{ width: 150 }}>
              {sortedMonths.map(r => (
                <MenuItem key={r.month} value={r.month}>{monthLabel(r.month)}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>
        {momData.rows.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 3 }}>Немає даних</Typography>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={momData.rows} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
                <Tooltip formatter={(v, name) => v != null ? [`${fmtNum(v)} м³`, name] : ['—', name]} />
                <Legend />
                <Bar dataKey={momData.lbl1} fill="#1565c0" radius={[3, 3, 0, 0]} />
                <Bar dataKey={momData.lbl2} fill="#e65100" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {momData.r1 && momData.r2 && (
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                {[
                  { label: 'Загальне', v1: momData.r1.total ?? momData.r1.consumption, v2: momData.r2.total ?? momData.r2.consumption },
                ].map(({ label, v1, v2 }) => {
                  const delta = v1 > 0 && v2 != null ? ((v2 - v1) / v1 * 100) : null
                  const up    = delta > 0
                  return (
                    <Box key={label} sx={{ minWidth: 100 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {v2 != null ? `${fmtNum(v2)} м³` : '—'}
                      </Typography>
                      {delta != null && (
                        <Typography variant="caption" color={up ? 'error.main' : 'success.main'} fontWeight={600}>
                          {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                        </Typography>
                      )}
                    </Box>
                  )
                })}
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* 4. YoY */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6">Порівняння рік до року</Typography>
          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            <TextField select size="small" value={compareYear1}
              onChange={e => setCompareYear1(e.target.value)} sx={{ width: 100 }}>
              {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            <TextField select size="small" value={compareYear2}
              onChange={e => setCompareYear2(e.target.value)} sx={{ width: 100 }}>
              {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Stack>
        </Box>
        {yoyData.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 3 }}>Немає даних</Typography>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yoyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
                <Tooltip formatter={(v, name) => v != null ? [`${fmtNum(v)} м³`, name] : ['—', name]} />
                <Legend />
                <Bar dataKey={compareYear1} fill="#1565c0" radius={[3, 3, 0, 0]} />
                <Bar dataKey={compareYear2} fill="#43a047" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {yoyTotals.y1 != null && yoyTotals.y2 != null && (
              <Box sx={{ display: 'flex', gap: 4, mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">{compareYear1} — всього</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmtInt(yoyTotals.y1)} м³</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{compareYear2} — всього</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmtInt(yoyTotals.y2)} м³</Typography>
                  {yoyTotals.y1 > 0 && (() => {
                    const delta = (yoyTotals.y2 - yoyTotals.y1) / yoyTotals.y1 * 100
                    const up = delta > 0
                    return (
                      <Typography variant="caption" color={up ? 'error.main' : 'success.main'} fontWeight={600}>
                        {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                      </Typography>
                    )
                  })()}
                </Box>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* 5. Сезонність */}
      {seasonData.length >= 3 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Сезонність (середнє по місяцях за всі роки)</Typography>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={seasonData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
              <Tooltip formatter={v => [`${fmtNum(v)} м³`, 'Середнє']} />
              <Line type="monotone" dataKey="Середнє" stroke="#1565c0" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Показує типовий профіль споживання протягом року на основі всіх наявних даних
          </Typography>
        </Paper>
      )}

    </Box>
  )
}
