import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Paper, Grid, TextField, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  InputAdornment, Button, Alert, CircularProgress, Snackbar,
} from '@mui/material'
import {
  ElectricBolt as BoltIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import { electricityAPI } from '../../api/electricity'

const COEFF_MLYN_1  = 100
const COEFF_MLYN_2  = 1
const COEFF_PALETKA = 1000

const n = (v) => parseFloat(String(v).replace(',', '.')) || 0
const fmt = (v) => Number(v || 0).toLocaleString('uk-UA')

const NumField = ({ label, value, onChange, readOnly = false, highlight = false }) => (
  <TextField
    fullWidth size="small" label={label}
    value={value}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    inputProps={{ readOnly, style: { textAlign: 'right' } }}
    InputProps={{ endAdornment: <InputAdornment position="end">кВт·год</InputAdornment> }}
    sx={highlight ? { '& .MuiOutlinedInput-root': { bgcolor: 'success.50' } } : {}}
  />
)

const MeterField = ({ label, value, onChange }) => (
  <TextField
    fullWidth size="small" label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    inputProps={{ style: { textAlign: 'right' } }}
  />
)

const now = new Date()
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

export default function ElectricityPage() {
  const [month, setMonth] = useState(defaultMonth)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  const [ktpOld,    setKtpOld]    = useState('')
  const [ktpNew,    setKtpNew]    = useState('')
  const [mlyn1Start, setMlyn1Start] = useState('')
  const [mlyn1End,   setMlyn1End]   = useState('')
  const [mlyn2Start, setMlyn2Start] = useState('')
  const [mlyn2End,   setMlyn2End]   = useState('')
  const [paletStart, setPaletStart] = useState('')
  const [paletEnd,   setPaletEnd]   = useState('')

  const clearFields = () => {
    setKtpOld(''); setKtpNew('')
    setMlyn1Start(''); setMlyn1End('')
    setMlyn2Start(''); setMlyn2End('')
    setPaletStart(''); setPaletEnd('')
  }

  const fillFromData = (data) => {
    setKtpOld(data.ktp_old || '')
    setKtpNew(data.ktp_new || '')
    setMlyn1Start(data.mlyn1_start || '')
    setMlyn1End(data.mlyn1_end || '')
    setMlyn2Start(data.mlyn2_start || '')
    setMlyn2End(data.mlyn2_end || '')
    setPaletStart(data.palet_start || '')
    setPaletEnd(data.palet_end || '')
  }

  const loadMonth = useCallback(async (m) => {
    setLoading(true)
    try {
      const data = await electricityAPI.getMonth(m)
      fillFromData(data)
    } catch (e) {
      if (e?.response?.status === 404) {
        clearFields()
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMonth(month) }, [month, loadMonth])

  const handleSave = async () => {
    setSaving(true)
    try {
      await electricityAPI.save({
        month,
        ktp_old:     n(ktpOld),
        ktp_new:     n(ktpNew),
        mlyn1_start: n(mlyn1Start),
        mlyn1_end:   n(mlyn1End),
        mlyn2_start: n(mlyn2Start),
        mlyn2_end:   n(mlyn2End),
        palet_start: n(paletStart),
        palet_end:   n(paletEnd),
      })
      setToast({ open: true, message: `Збережено за ${month}`, severity: 'success' })
    } catch {
      setToast({ open: true, message: 'Помилка збереження', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Розрахунки
  const ktpTotal  = n(ktpOld) + n(ktpNew)
  const mlyn1kwh  = (n(mlyn1End) - n(mlyn1Start)) * COEFF_MLYN_1
  const mlyn2kwh  = (n(mlyn2End) - n(mlyn2Start)) * COEFF_MLYN_2
  const mlynTotal = mlyn1kwh + mlyn2kwh
  const paletKwh  = (n(paletEnd) - n(paletStart)) * COEFF_PALETKA
  const elevator  = ktpTotal - mlynTotal - paletKwh

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <BoltIcon color="warning" fontSize="large" />
        <Typography variant="h4">Електроенергія</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            type="month" size="small" value={month}
            onChange={(e) => setMonth(e.target.value)}
            sx={{ width: 170 }}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained" startIcon={<SaveIcon />}
            onClick={handleSave} disabled={saving || loading}
          >
            {saving ? 'Збереження...' : 'Зберегти'}
          </Button>
        </Box>
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}

      {!loading && (
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
                  <NumField label="Загальне" value={ktpTotal || ''} readOnly highlight />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Млин */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Млин + склад готової продукції
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="caption" color="text.secondary">
                Лічильник 1 (× {COEFF_MLYN_1})
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0, mb: 1.5 }}>
                <Grid item xs={6}>
                  <MeterField label="Початок місяця" value={mlyn1Start} onChange={setMlyn1Start} />
                </Grid>
                <Grid item xs={6}>
                  <MeterField label="Кінець місяця" value={mlyn1End} onChange={setMlyn1End} />
                </Grid>
                <Grid item xs={12}>
                  <NumField label={`Спожито (× ${COEFF_MLYN_1})`} value={mlyn1kwh || ''} readOnly />
                </Grid>
              </Grid>

              <Typography variant="caption" color="text.secondary">
                Лічильник 2 (× {COEFF_MLYN_2})
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0, mb: 1.5 }}>
                <Grid item xs={6}>
                  <MeterField label="Початок місяця" value={mlyn2Start} onChange={setMlyn2Start} />
                </Grid>
                <Grid item xs={6}>
                  <MeterField label="Кінець місяця" value={mlyn2End} onChange={setMlyn2End} />
                </Grid>
                <Grid item xs={12}>
                  <NumField label={`Спожито (× ${COEFF_MLYN_2})`} value={mlyn2kwh || ''} readOnly />
                </Grid>
              </Grid>

              <NumField label="Разом млин" value={mlynTotal || ''} readOnly highlight />
            </Paper>
          </Grid>

          {/* Пелетний цех */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Пелетний цех
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Лічильник (× {COEFF_PALETKA})
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0 }}>
                <Grid item xs={6}>
                  <MeterField label="Початок місяця" value={paletStart} onChange={setPaletStart} />
                </Grid>
                <Grid item xs={6}>
                  <MeterField label="Кінець місяця" value={paletEnd} onChange={setPaletEnd} />
                </Grid>
                <Grid item xs={12}>
                  <NumField label={`Спожито (× ${COEFF_PALETKA})`} value={paletKwh || ''} readOnly highlight />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Підсумок */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Підсумок розподілу
              </Typography>
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
                          (Загальне − Млин − Пелетний)
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
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
