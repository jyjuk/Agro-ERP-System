import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Paper, Grid, TextField, Divider,
  InputAdornment, Button, Alert, CircularProgress, Snackbar, Tabs, Tab,
} from '@mui/material'
import { ElectricBolt as BoltIcon, Save as SaveIcon } from '@mui/icons-material'
import { electricityAPI } from '../../api/electricity'
import ElectricityAnalytics from './ElectricityAnalytics'
import { useAuth } from '../../context/AuthContext'

const COEFF_MLYN_1  = 100
const COEFF_MLYN_2  = 1
const COEFF_PALETKA = 1000

const n = (v) => parseFloat(String(v).replace(',', '.')) || 0
const fmt = (v) => Number(v || 0).toLocaleString('uk-UA')

const now = new Date()
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

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

export default function ElectricityPage() {
  const { isAdmin } = useAuth()
  const admin = isAdmin()
  const [tab, setTab] = useState(0)
  const [month, setMonth] = useState(defaultMonth)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allRecords, setAllRecords] = useState([])
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  const [ktpOld,    setKtpOld]    = useState('')
  const [ktpNew,    setKtpNew]    = useState('')
  const [mlyn1Start, setMlyn1Start] = useState('')
  const [mlyn1End,   setMlyn1End]   = useState('')
  const [mlyn2Start, setMlyn2Start] = useState('')
  const [mlyn2End,   setMlyn2End]   = useState('')
  const [paletStart, setPaletStart] = useState('')
  const [paletEnd,   setPaletEnd]   = useState('')
  const [genStart,   setGenStart]   = useState('')
  const [genEnd,     setGenEnd]     = useState('')

  const clearFields = () => {
    setKtpOld(''); setKtpNew('')
    setMlyn1Start(''); setMlyn1End('')
    setMlyn2Start(''); setMlyn2End('')
    setPaletStart(''); setPaletEnd('')
    setGenStart(''); setGenEnd('')
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
    setGenStart(data.gen_start != null ? data.gen_start : '')
    setGenEnd(data.gen_end != null ? data.gen_end : '')
  }

  const loadAllRecords = useCallback(async () => {
    try {
      const data = await electricityAPI.listMonths()
      setAllRecords(data)
    } catch { /* ігноруємо */ }
  }, [])

  const loadMonth = useCallback(async (m) => {
    setLoading(true)
    try {
      const data = await electricityAPI.getMonth(m)
      fillFromData(data)
    } catch (e) {
      if (e?.response?.status === 404) clearFields()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMonth(month) }, [month, loadMonth])
  useEffect(() => { loadAllRecords() }, [loadAllRecords])

  const handleSave = async () => {
    setSaving(true)
    try {
      await electricityAPI.save({
        month,
        ktp_old: n(ktpOld), ktp_new: n(ktpNew),
        mlyn1_start: n(mlyn1Start), mlyn1_end: n(mlyn1End),
        mlyn2_start: n(mlyn2Start), mlyn2_end: n(mlyn2End),
        palet_start: n(paletStart), palet_end: n(paletEnd),
        gen_start: genStart !== '' ? n(genStart) : null,
        gen_end:   genEnd   !== '' ? n(genEnd)   : null,
      })
      await loadAllRecords()
      setToast({ open: true, message: `Збережено за ${month}`, severity: 'success' })
    } catch {
      setToast({ open: true, message: 'Помилка збереження', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Розрахунки
  const ktpTotal  = n(ktpOld) + n(ktpNew)
  const genKwh    = genStart !== '' && genEnd !== '' ? n(genEnd) - n(genStart) : 0
  const totalKwh  = ktpTotal + genKwh
  const mlyn1kwh  = (n(mlyn1End) - n(mlyn1Start)) * COEFF_MLYN_1
  const mlyn2kwh  = (n(mlyn2End) - n(mlyn2Start)) * COEFF_MLYN_2
  const mlynTotal = mlyn1kwh + mlyn2kwh
  const paletKwh  = (n(paletEnd) - n(paletStart)) * COEFF_PALETKA
  const elevator  = totalKwh - mlynTotal - paletKwh

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <BoltIcon color="warning" fontSize="large" />
        <Typography variant="h4">Електроенергія</Typography>
      </Box>

      {admin && (
        <Paper sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Введення даних" />
            <Tab label="Аналітика" />
          </Tabs>
        </Paper>
      )}

      {/* ===== TAB 0: Введення (тільки адмін) ===== */}
      {admin && tab === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              type="month" size="small" value={month}
              onChange={(e) => setMonth(e.target.value)}
              sx={{ width: 170 }}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" startIcon={<SaveIcon />}
              onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Збереження...' : 'Зберегти'}
            </Button>
          </Box>

          {loading
            ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            : (
              <Grid container spacing={3}>
                {/* КТП */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>КТП</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12}><NumField label="Старе КТП" value={ktpOld} onChange={setKtpOld} /></Grid>
                      <Grid item xs={12}><NumField label="Нове КТП" value={ktpNew} onChange={setKtpNew} /></Grid>
                      <Grid item xs={12}><NumField label="Загальне" value={ktpTotal || ''} readOnly highlight /></Grid>
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

                    <Typography variant="caption" color="text.secondary">Лічильник 1 (× {COEFF_MLYN_1})</Typography>
                    <Grid container spacing={1} sx={{ mt: 0, mb: 1.5 }}>
                      <Grid item xs={6}><MeterField label="Початок місяця" value={mlyn1Start} onChange={setMlyn1Start} /></Grid>
                      <Grid item xs={6}><MeterField label="Кінець місяця" value={mlyn1End} onChange={setMlyn1End} /></Grid>
                      <Grid item xs={12}><NumField label={`Спожито (× ${COEFF_MLYN_1})`} value={mlyn1kwh || ''} readOnly /></Grid>
                    </Grid>

                    <Typography variant="caption" color="text.secondary">Лічильник 2 (× {COEFF_MLYN_2})</Typography>
                    <Grid container spacing={1} sx={{ mt: 0, mb: 1.5 }}>
                      <Grid item xs={6}><MeterField label="Початок місяця" value={mlyn2Start} onChange={setMlyn2Start} /></Grid>
                      <Grid item xs={6}><MeterField label="Кінець місяця" value={mlyn2End} onChange={setMlyn2End} /></Grid>
                      <Grid item xs={12}><NumField label={`Спожито (× ${COEFF_MLYN_2})`} value={mlyn2kwh || ''} readOnly /></Grid>
                    </Grid>

                    <NumField label="Разом млин" value={mlynTotal || ''} readOnly highlight />
                  </Paper>
                </Grid>

                {/* Пелетний цех */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Пелетний цех</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="caption" color="text.secondary">Лічильник (× {COEFF_PALETKA})</Typography>
                    <Grid container spacing={1} sx={{ mt: 0 }}>
                      <Grid item xs={6}><MeterField label="Початок місяця" value={paletStart} onChange={setPaletStart} /></Grid>
                      <Grid item xs={6}><MeterField label="Кінець місяця" value={paletEnd} onChange={setPaletEnd} /></Grid>
                      <Grid item xs={12}><NumField label={`Спожито (× ${COEFF_PALETKA})`} value={paletKwh || ''} readOnly highlight /></Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Генератор */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, border: '1px dashed', borderColor: 'warning.main' }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom color="warning.dark">
                      Дизельний генератор 550 кВт (необов'язково)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      Заповнюй лише якщо генератор працював у цьому місяці. Показники лічильника в кВт·год (× 1).
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <MeterField label="Початок місяця" value={genStart} onChange={setGenStart} />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <MeterField label="Кінець місяця" value={genEnd} onChange={setGenEnd} />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <NumField
                          label="Спожито (генератор)"
                          value={genKwh || ''}
                          readOnly
                          highlight={genKwh > 0}
                        />
                      </Grid>
                      {genKwh > 0 && (
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" color="warning.dark" fontWeight={600}>
                            ⚠ Дорога електроенергія!<br />
                            Враховано в загальному.
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Підсумок */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Підсумок розподілу</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {[
                        { label: 'КТП (загальне)', value: ktpTotal, color: 'text.primary' },
                        ...(genKwh > 0 ? [{ label: 'Генератор', value: genKwh, color: 'warning.dark' }] : []),
                        { label: 'Всього', value: totalKwh, color: 'text.primary', bold: true },
                        { label: 'Млин + склад', value: mlynTotal, color: 'primary.main' },
                        { label: 'Пелетний цех', value: paletKwh, color: 'error.main' },
                        { label: 'Елеватор + офіс', value: elevator, color: 'success.main' },
                      ].map(({ label, value, color, bold }) => (
                        <Box key={label}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="h6" color={color} fontWeight={bold ? 700 : 400}>
                            {fmt(Math.round(value))} кВт·год
                          </Typography>
                          {totalKwh > 0 && label !== 'КТП (загальне)' && label !== 'Всього' && (
                            <Typography variant="caption" color="text.secondary">
                              {(value / totalKwh * 100).toFixed(1)}%
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )
          }
        </>
      )}

      {/* ===== Аналітика (адмін: tab 1, інші: завжди) ===== */}
      {(!admin || tab === 1) && <ElectricityAnalytics records={allRecords} />}

      <Snackbar open={toast.open} autoHideDuration={3000}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
