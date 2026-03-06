import { useState } from 'react'
import {
  Box, Typography, Paper, Grid, TextField, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  InputAdornment,
} from '@mui/material'
import { ElectricBolt as BoltIcon } from '@mui/icons-material'

const COEFF_PALETKA = 1000
const COEFF_MLYN_1  = 100
const COEFF_MLYN_2  = 1

const n = (v) => parseFloat(v) || 0
const fmt = (v) => Number(v).toLocaleString('uk-UA')

const NumField = ({ label, value, onChange, readOnly = false, highlight = false }) => (
  <TextField
    fullWidth
    size="small"
    label={label}
    value={value}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    inputProps={{ readOnly, style: { textAlign: 'right' } }}
    InputProps={{ endAdornment: <InputAdornment position="end">кВт·год</InputAdornment> }}
    sx={highlight ? { '& .MuiOutlinedInput-root': { bgcolor: 'success.50' } } : {}}
  />
)

const MeterField = ({ label, value, onChange }) => (
  <TextField
    fullWidth
    size="small"
    label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    inputProps={{ style: { textAlign: 'right' } }}
  />
)

export default function ElectricityPage() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  // КТП (вводиться вже в кВт·год)
  const [ktpOld, setKtpOld] = useState('')
  const [ktpNew, setKtpNew] = useState('')

  // Млин — лічильник 1 (×100)
  const [mlyn1Start, setMlyn1Start] = useState('')
  const [mlyn1End,   setMlyn1End]   = useState('')

  // Млин — лічильник 2 (×1)
  const [mlyn2Start, setMlyn2Start] = useState('')
  const [mlyn2End,   setMlyn2End]   = useState('')

  // Палетка — лічильник (×1000)
  const [paletStart, setPaletStart] = useState('')
  const [paletEnd,   setPaletEnd]   = useState('')

  // Розрахунки
  const ktpTotal   = n(ktpOld) + n(ktpNew)
  const mlyn1kwh   = (n(mlyn1End) - n(mlyn1Start)) * COEFF_MLYN_1
  const mlyn2kwh   = (n(mlyn2End) - n(mlyn2Start)) * COEFF_MLYN_2
  const mlynTotal  = mlyn1kwh + mlyn2kwh
  const paletKwh   = (n(paletEnd) - n(paletStart)) * COEFF_PALETKA
  const elevator   = ktpTotal - mlynTotal - paletKwh

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <BoltIcon color="warning" fontSize="large" />
        <Typography variant="h4">Електроенергія</Typography>
        <TextField
          type="month"
          size="small"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          sx={{ ml: 'auto', width: 180 }}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <Grid container spacing={3}>

        {/* КТП */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>КТП</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <NumField label="Старе КТП" value={ktpOld} onChange={setKtpOld} />
              </Grid>
              <Grid item xs={12}>
                <NumField label="Нове КТП" value={ktpNew} onChange={setKtpNew} />
              </Grid>
              <Grid item xs={12}>
                <NumField label="Загальне КТП" value={ktpTotal || ''} readOnly highlight />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Млин */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Млин</Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="caption" color="text.secondary">Лічильник 1 (× {COEFF_MLYN_1})</Typography>
            <Grid container spacing={1} sx={{ mb: 2, mt: 0 }}>
              <Grid item xs={6}>
                <MeterField label="Початок місяця" value={mlyn1Start} onChange={setMlyn1Start} />
              </Grid>
              <Grid item xs={6}>
                <MeterField label="Кінець місяця" value={mlyn1End} onChange={setMlyn1End} />
              </Grid>
              <Grid item xs={12}>
                <NumField label="Спожито (лічильник 1)" value={mlyn1kwh || ''} readOnly />
              </Grid>
            </Grid>

            <Typography variant="caption" color="text.secondary">Лічильник 2 (× {COEFF_MLYN_2})</Typography>
            <Grid container spacing={1} sx={{ mt: 0 }}>
              <Grid item xs={6}>
                <MeterField label="Початок місяця" value={mlyn2Start} onChange={setMlyn2Start} />
              </Grid>
              <Grid item xs={6}>
                <MeterField label="Кінець місяця" value={mlyn2End} onChange={setMlyn2End} />
              </Grid>
              <Grid item xs={12}>
                <NumField label="Спожито (лічильник 2)" value={mlyn2kwh || ''} readOnly />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Палетка */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Пелетний цех
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary">Лічильник (× {COEFF_PALETKA})</Typography>
            <Grid container spacing={1} sx={{ mt: 0 }}>
              <Grid item xs={6}>
                <MeterField label="Початок місяця" value={paletStart} onChange={setPaletStart} />
              </Grid>
              <Grid item xs={6}>
                <MeterField label="Кінець місяця" value={paletEnd} onChange={setPaletEnd} />
              </Grid>
              <Grid item xs={12}>
                <NumField label="Спожито" value={paletKwh || ''} readOnly />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Підсумок */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Підсумок розподілу</Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Споживач</TableCell>
                    <TableCell align="right">кВт·год</TableCell>
                    <TableCell align="right">% від загального</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><strong>Загальне (КТП1 + КТП2)</strong></TableCell>
                    <TableCell align="right"><strong>{fmt(ktpTotal)}</strong></TableCell>
                    <TableCell align="right">100%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 3 }}>Млин + склад готової продукції</TableCell>
                    <TableCell align="right">{fmt(mlynTotal)}</TableCell>
                    <TableCell align="right">
                      {ktpTotal ? (mlynTotal / ktpTotal * 100).toFixed(1) + '%' : '—'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 3 }}>Пелетний цех</TableCell>
                    <TableCell align="right">{fmt(paletKwh)}</TableCell>
                    <TableCell align="right">
                      {ktpTotal ? (paletKwh / ktpTotal * 100).toFixed(1) + '%' : '—'}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'success.50' }}>
                    <TableCell sx={{ pl: 3 }}>
                      <strong>Елеватор + офіс</strong>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        (розрахункове = Загальне − Млин − Пелетний)
                      </Typography>
                    </TableCell>
                    <TableCell align="right"><strong>{fmt(elevator)}</strong></TableCell>
                    <TableCell align="right">
                      {ktpTotal ? (elevator / ktpTotal * 100).toFixed(1) + '%' : '—'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  )
}
