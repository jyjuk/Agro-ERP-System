import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, FormControl, InputLabel,
  Select, MenuItem, Autocomplete
} from '@mui/material'

const DEFAULT_TYPES = ['авто', 'трактор', 'тягач', 'спецтехніка', 'бочка', 'причіп', 'інше']

const emptyForm = { name: '', unit_type: '', plate_number: '', notes: '' }

const TransportDialog = ({ open, onClose, onSave, unit }) => {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (unit) {
      setForm({
        name: unit.name || '',
        unit_type: unit.unit_type || '',
        plate_number: unit.plate_number || '',
        notes: unit.notes || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [unit, open])

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = () => {
    if (!form.name.trim() || !form.unit_type.trim()) return
    onSave({
      name: form.name.trim(),
      unit_type: form.unit_type.trim(),
      plate_number: form.plate_number.trim() || null,
      notes: form.notes.trim() || null,
    })
  }

  const isEdit = Boolean(unit)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Редагувати транспорт' : 'Додати транспорт'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              label="Назва *"
              fullWidth
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Напр.: КамАЗ 5511, МТЗ-82, Причіп бочка"
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              freeSolo
              options={DEFAULT_TYPES}
              value={form.unit_type}
              onInputChange={(_, value) => setForm(prev => ({ ...prev, unit_type: value }))}
              onChange={(_, value) => setForm(prev => ({ ...prev, unit_type: value || '' }))}
              renderInput={(params) => (
                <TextField {...params} label="Тип *" size="small"
                  placeholder="авто, трактор, тягач..." />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Держ. номер"
              fullWidth
              value={form.plate_number}
              onChange={handleChange('plate_number')}
              placeholder="АА 1234 ВВ"
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Примітки"
              fullWidth
              multiline
              rows={2}
              value={form.notes}
              onChange={handleChange('notes')}
              size="small"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!form.name.trim() || !form.unit_type.trim()}
        >
          {isEdit ? 'Зберегти' : 'Додати'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TransportDialog
