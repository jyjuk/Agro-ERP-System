import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material'
import { suppliersAPI } from '../../api/suppliers'

export default function SupplierDialog({ open, onClose, onSuccess, supplier = null }) {
  const isEdit = !!supplier

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    address: '',
    tax_id: '',
    bank_details: '',
    is_active: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (isEdit && supplier) {
        setFormData({
          name: supplier.name || '',
          contact_person: supplier.contact_person || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          tax_id: supplier.tax_id || '',
          bank_details: supplier.bank_details || '',
          is_active: supplier.is_active !== undefined ? supplier.is_active : true,
        })
      }
    }
  }, [open, supplier, isEdit])

  const handleChange = (e) => {
    const { name, value, checked } = e.target
    setFormData({
      ...formData,
      [name]: name === 'is_active' ? checked : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate
      if (!formData.name) {
        setError('Введіть назву постачальника')
        setLoading(false)
        return
      }

      const payload = {
        name: formData.name,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        address: formData.address || null,
        tax_id: formData.tax_id || null,
        bank_details: formData.bank_details || null,
        is_active: formData.is_active,
      }

      if (isEdit) {
        await suppliersAPI.update(supplier.id, payload)
      } else {
        await suppliersAPI.create(payload)
      }

      onSuccess()
      handleClose()
    } catch (err) {
      console.error('Failed to save supplier:', err)
      setError(err.response?.data?.detail || 'Помилка при збереженні постачальника')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      address: '',
      tax_id: '',
      bank_details: '',
      is_active: true,
    })
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Редагувати постачальника' : 'Новий постачальник'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Назва постачальника"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Контактна особа"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Телефон"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Адреса"
                name="address"
                value={formData.address}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ЄДРПОУ / ІПН"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Банківські реквізити"
                name="bank_details"
                value={formData.bank_details}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleChange}
                    name="is_active"
                  />
                }
                label="Активний"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Збереження...' : isEdit ? 'Оновити' : 'Створити'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
