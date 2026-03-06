import { useState, useMemo } from 'react'
import {
  Box, Typography, Paper, Grid, TextField, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  MenuItem, Button, Stack,
} from '@mui/material'
import { FileDownload as DownloadIcon } from '@mui/icons-material'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const MONTHS_UK = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']
const COLORS = { mlyn: '#1976d2', palet: '#e65100', elevator: '#2e7d32', total: '#6a1b9a' }
const PIE_COLORS = [COLORS.mlyn, COLORS.palet, COLORS.elevator]

const fmtNum = (v) => Number(v || 0).toLocaleString('uk-UA')
const monthLabel = (m) => {
  const [y, mo] = m.split('-')
  return `${MONTHS_UK[parseInt(mo) - 1]} ${y}`
}
const shortLabel = (m) => {
  const [y, mo] = m.split('-')
  return `${MONTHS_UK[parseInt(mo) - 1]}'${y.slice(2)}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <Paper sx={{ p: 1.5, fontSize: 13 }}>
      <Typography variant="caption" fontWeight={700}>{label}</Typography>
      {payload.map(p => (
        <Box key={p.name} sx={{ color: p.color }}>
          {p.name}: <strong>{fmtNum(p.value)} кВт·год</strong>
        </Box>
      ))}
    </Paper>
  )
}

export default function ElectricityAnalytics({ records }) {
  const years = useMemo(() => {
    const s = new Set(records.map(r => r.month.slice(0, 4)))
    return [...s].sort().reverse()
  }, [records])

  const [yearFilter, setYearFilter] = useState(years[0] || '')
  const [compareYear1, setCompareYear1] = useState(years[0] || '')
  const [compareYear2, setCompareYear2] = useState(years[1] || years[0] || '')
  const [pieMonth, setPieMonth] = useState(records[0]?.month || '')

  // 1. Дані для графіку динаміки (відфільтровано по року)
  const dynamicData = useMemo(() =>
    records
      .filter(r => !yearFilter || r.month.startsWith(yearFilter))
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(r => ({
        name: shortLabel(r.month),
        'Млин': Math.round(r.mlyn_total),
        'Пелетний': Math.round(r.palet_kwh),
        'Елеватор': Math.round(r.elevator_kwh),
      })),
    [records, yearFilter]
  )

  // 2. Дані для кругової діаграми
  const pieData = useMemo(() => {
    const r = records.find(x => x.month === pieMonth)
    if (!r) return []
    return [
      { name: 'Млин', value: Math.round(r.mlyn_total) },
      { name: 'Пелетний', value: Math.round(r.palet_kwh) },
      { name: 'Елеватор', value: Math.round(r.elevator_kwh) },
    ]
  }, [records, pieMonth])

  // 3. Таблиця по роках
  const tableByYear = useMemo(() => {
    const grouped = {}
    records.forEach(r => {
      const y = r.month.slice(0, 4)
      const mo = parseInt(r.month.slice(5)) - 1
      if (!grouped[y]) grouped[y] = Array(12).fill(null)
      grouped[y][mo] = r
    })
    return grouped
  }, [records])

  const tableYears = Object.keys(tableByYear).sort()

  // Підсумки по роках
  const yearTotals = useMemo(() => {
    const t = {}
    tableYears.forEach(y => {
      const rows = tableByYear[y].filter(Boolean)
      t[y] = {
        total: rows.reduce((s, r) => s + r.ktp_total, 0),
        mlyn: rows.reduce((s, r) => s + r.mlyn_total, 0),
        palet: rows.reduce((s, r) => s + r.palet_kwh, 0),
        elevator: rows.reduce((s, r) => s + r.elevator_kwh, 0),
      }
    })
    return t
  }, [tableByYear, tableYears])

  // 4. Порівняння рік до року
  const yoyData = useMemo(() => {
    return MONTHS_UK.map((mo, i) => {
      const moStr = String(i + 1).padStart(2, '0')
      const r1 = records.find(r => r.month === `${compareYear1}-${moStr}`)
      const r2 = records.find(r => r.month === `${compareYear2}-${moStr}`)
      if (!r1 && !r2) return null
      return {
        name: mo,
        [compareYear1]: r1 ? Math.round(r1.ktp_total) : null,
        [compareYear2]: r2 ? Math.round(r2.ktp_total) : null,
      }
    }).filter(Boolean)
  }, [records, compareYear1, compareYear2])

  // Експорт таблиці
  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    const headers = ['Місяць', 'Загальне', 'Млин', 'Пелетний', 'Елеватор']
    const rows = []
    tableYears.forEach(y => {
      tableByYear[y].forEach((r, i) => {
        if (!r) return
        rows.push([
          `${MONTHS_UK[i]} ${y}`,
          Math.round(r.ktp_total),
          Math.round(r.mlyn_total),
          Math.round(r.palet_kwh),
          Math.round(r.elevator_kwh),
        ])
      })
      const t = yearTotals[y]
      rows.push([`Разом ${y}`, Math.round(t.total), Math.round(t.mlyn), Math.round(t.palet), Math.round(t.elevator)])
      rows.push([])
    })
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Електроенергія')
    XLSX.writeFile(wb, `elektroenergiia_${format(new Date(), 'dd-MM-yyyy')}.xlsx`)
  }

  if (!records.length) {
    return (
      <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
        Немає даних для аналітики. Введіть показники хоча б за один місяць.
      </Typography>
    )
  }

  return (
    <Box>

      {/* 1. Динаміка по місяцях */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Typography variant="h6">Динаміка споживання по місяцях</Typography>
          <TextField
            select size="small" value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            sx={{ width: 120, ml: 'auto' }}
          >
            <MenuItem value="">Всі роки</MenuItem>
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
        </Box>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dynamicData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Млин" stackId="a" fill={COLORS.mlyn} />
            <Bar dataKey="Пелетний" stackId="a" fill={COLORS.palet} />
            <Bar dataKey="Елеватор" stackId="a" fill={COLORS.elevator} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* 2. Структура за місяць */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Typography variant="h6">Структура споживання за місяць</Typography>
          <TextField
            select size="small" value={pieMonth}
            onChange={e => setPieMonth(e.target.value)}
            sx={{ width: 170, ml: 'auto' }}
          >
            {records.sort((a, b) => b.month.localeCompare(a.month)).map(r => (
              <MenuItem key={r.month} value={r.month}>{monthLabel(r.month)}</MenuItem>
            ))}
          </TextField>
        </Box>
        <Grid container alignItems="center">
          <Grid item xs={12} md={5}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={v => `${fmtNum(v)} кВт·год`} />
              </PieChart>
            </ResponsiveContainer>
          </Grid>
          <Grid item xs={12} md={7}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Споживач</TableCell>
                    <TableCell align="right">кВт·год</TableCell>
                    <TableCell align="right">%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pieData.map((row, i) => {
                    const total = pieData.reduce((s, r) => s + r.value, 0)
                    return (
                      <TableRow key={row.name}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: PIE_COLORS[i] }} />
                            {row.name}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{fmtNum(row.value)}</TableCell>
                        <TableCell align="right">{total ? (row.value / total * 100).toFixed(1) + '%' : '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Загальне</strong></TableCell>
                    <TableCell align="right"><strong>{fmtNum(pieData.reduce((s, r) => s + r.value, 0))}</strong></TableCell>
                    <TableCell align="right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>

      {/* 3. Помісячна таблиця */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Помісячна таблиця</Typography>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
            onClick={handleExport} sx={{ ml: 'auto' }}>
            Excel
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Місяць</TableCell>
                <TableCell align="right">Загальне</TableCell>
                <TableCell align="right">Млин</TableCell>
                <TableCell align="right">Пелетний</TableCell>
                <TableCell align="right">Елеватор</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableYears.map(y => [
                ...tableByYear[y].map((r, i) => r ? (
                  <TableRow key={`${y}-${i}`} hover>
                    <TableCell>{MONTHS_UK[i]} {y}</TableCell>
                    <TableCell align="right">{fmtNum(Math.round(r.ktp_total))}</TableCell>
                    <TableCell align="right">{fmtNum(Math.round(r.mlyn_total))}</TableCell>
                    <TableCell align="right">{fmtNum(Math.round(r.palet_kwh))}</TableCell>
                    <TableCell align="right">{fmtNum(Math.round(r.elevator_kwh))}</TableCell>
                  </TableRow>
                ) : null),
                <TableRow key={`total-${y}`} sx={{ bgcolor: 'primary.50' }}>
                  <TableCell><strong>Разом {y}</strong></TableCell>
                  <TableCell align="right"><strong>{fmtNum(Math.round(yearTotals[y].total))}</strong></TableCell>
                  <TableCell align="right"><strong>{fmtNum(Math.round(yearTotals[y].mlyn))}</strong></TableCell>
                  <TableCell align="right"><strong>{fmtNum(Math.round(yearTotals[y].palet))}</strong></TableCell>
                  <TableCell align="right"><strong>{fmtNum(Math.round(yearTotals[y].elevator))}</strong></TableCell>
                </TableRow>,
              ])}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 4. Порівняння рік до року */}
      <Paper sx={{ p: 2 }}>
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
          <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
            Немає даних для порівняння
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yoyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey={compareYear1} fill={COLORS.mlyn} radius={[3, 3, 0, 0]} />
              <Bar dataKey={compareYear2} fill={COLORS.elevator} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

    </Box>
  )
}
