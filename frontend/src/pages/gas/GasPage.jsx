import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Paper, Grid, TextField, Divider,
  InputAdornment, Button, Alert, CircularProgress, Snackbar, Tabs, Tab,
} from '@mui/material'
import { LocalFireDepartment as GasIcon, Save as SaveIcon } from '@mui/icons-material'
import { gasAPI } from '../../api/gas'
import GasAnalytics from './GasAnalytics'
import { useAuth } from '../../context/AuthContext'

const now = new Date()
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const n  = (v) => v === '' || v == null ? null : parseFloat(String(v).replace(',', '.')) || null
const fmt = (v) => v != null ? Number(v).toLocaleString('uk-UA', { maximumFractionDigits: 2 }) : '—'

const NumField = ({ label, value, onChange, readOnly = false, unit = 'м³', highlight = false }) => (
  <TextField
    fullWidth size="small" label={label}
    value={value}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    inputProps={{ readOnly, style: { textAlign: 'right' } }}
    InputProps={{ endAdornment: <InputAdornment position="end">{unit}</InputAdornment> }}
    sx={highlight ? { '& .MuiOutlinedInput-root': { bgcolor: 'success.50' } } : {}}
  />
)

export default function GasPage() {
  const { isAdmin } = useAuth()
  const admin = isAdmin()
  const [tab, setTab]         = useState(0)
  const [month, setMonth]     = useState(defaultMonth)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [allRecords, setAllRecords] = useState([])
  const [toast, setToast]     = useState({ open: false, message: '', severity: 'success' })

  const [consumption, setConsumption] = useState('')
  const [vtv, setVtv]                 = useState('')

  const clearFields = () => { setConsumption(''); setVtv('') }

  const fillFromData = (data) => {
    setConsumption(data.consumption != null ? data.consumption : '')
    setVtv(data.vtv != null ? data.vtv : '')
  }

  const loadAllRecords = useCallback(async () => {
    try {
      const data = await gasAPI.listMonths()
      setAllRecords(data)
    } catch { /* ігноруємо */ }
  }, [])

  const loadMonth = useCallback(async (m) => {
    setLoading(true)
    try {
      const data = await gasAPI.getMonth(m)
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
      await gasAPI.save({
        month,
        consumption: n(consumption),
        vtv:         n(vtv),
      })
      await loadAllRecords()
      setToast({ open: true, message: `Збережено за ${month}`, severity: 'success' })
    } catch {
      setToast({ open: true, message: 'Помилка збереження', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Розрахунок підсумку
  const consumptionVal = n(consumption)
  const vtvVal         = n(vtv)
  const total          = (consumptionVal != null || vtvVal != null)
    ? (consumptionVal || 0) + (vtvVal || 0)
    : null

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <GasIcon color="primary" fontSize="large" />
        <Typography variant="h4">Газ</Typography>
      </Box>

      {admin && (
        <Paper sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Введення даних" />
            <Tab label="Аналітика" />
          </Tabs>
        </Paper>
      )}

      {/* TAB 0: Введення */}
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

                {/* Введення */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Споживання газу — зерносушки
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <NumField
                          label="Споживання за місяць"
                          value={consumption}
                          onChange={setConsumption}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <NumField
                          label="ВТВ (згідно методики газової служби)"
                          value={vtv}
                          onChange={setVtv}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Необов'язково — заповнюється якщо є дані від газової служби
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Підсумок */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Підсумок</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {[
                        { label: 'Споживання', value: consumptionVal, color: 'primary.main' },
                        ...(vtvVal != null ? [{ label: 'ВТВ', value: vtvVal, color: 'warning.dark' }] : []),
                        { label: 'Всього', value: total, color: 'text.primary', bold: true },
                      ].map(({ label, value, color, bold }) => (
                        <Box key={label}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="h6" color={color} fontWeight={bold ? 700 : 400}>
                            {value != null ? `${fmt(value)} м³` : '—'}
                          </Typography>
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

      {/* Аналітика */}
      {(!admin || tab === 1) && <GasAnalytics records={allRecords} />}

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
