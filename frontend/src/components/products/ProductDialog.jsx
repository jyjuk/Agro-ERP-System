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
  MenuItem,
  IconButton,
  Box,
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { productsAPI } from '../../api/products'

export default function ProductDialog({ open, onClose, onSuccess, product = null }) {
  const isEdit = !!product

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    unit_id: '',
    product_type: 'consumable',
    description: '',
    min_stock_level: 0,
    is_active: true,
  })
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadCategories()
      loadUnits()

      if (isEdit && product) {
        setFormData({
          name: product.name || '',
          category_id: product.category_id || '',
          unit_id: product.unit_id || '',
          product_type: product.product_type || 'consumable',
          description: product.description || '',
          min_stock_level: product.min_stock_level || 0,
          is_active: product.is_active !== undefined ? product.is_active : true,
        })
      }
    }
  }, [open, product, isEdit])

  const loadCategories = async () => {
    try {
      const data = await productsAPI.getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  const loadUnits = async () => {
    try {
      const data = await productsAPI.getUnits()
      setUnits(data)
    } catch (err) {
      console.error('Failed to load units:', err)
    }
  }

  const handleCreateCategory = async () => {
    const name = prompt('Введіть назву категорії:')
    if (!name) return

    try {
      const newCategory = await productsAPI.createCategory(name)
      setCategories([...categories, newCategory])
      setFormData({ ...formData, category_id: newCategory.id })
    } catch (err) {
      alert(err.response?.data?.detail || 'Помилка при створенні категорії')
    }
  }

  const handleCreateUnit = async () => {
    const name = prompt('Введіть назву одиниці виміру (наприклад: метр):')
    if (!name) return

    const short_name = prompt('Введіть скорочену назву (наприклад: м):')
    if (!short_name) return

    try {
      const newUnit = await productsAPI.createUnit(name, short_name)
      setUnits([...units, newUnit])
      setFormData({ ...formData, unit_id: newUnit.id })
    } catch (err) {
      alert(err.response?.data?.detail || 'Помилка при створенні одиниці виміру')
    }
  }

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
        setError('Введіть назву товару')
        setLoading(false)
        return
      }

      if (!formData.category_id) {
        setError('Виберіть категорію')
        setLoading(false)
        return
      }

      if (!formData.unit_id) {
        setError('Виберіть одиницю виміру')
        setLoading(false)
        return
      }

      const payload = {
        name: formData.name,
        category_id: parseInt(formData.category_id),
        unit_id: parseInt(formData.unit_id),
        product_type: formData.product_type,
        description: formData.description || null,
        min_stock_level: parseInt(formData.min_stock_level) || 0,
        is_active: formData.is_active,
      }

      if (isEdit) {
        await productsAPI.update(product.id, payload)
      } else {
        await productsAPI.create(payload)
      }

      onSuccess()
      handleClose()
    } catch (err) {
      console.error('Failed to save product:', err)
      setError(err.response?.data?.detail || 'Помилка при збереженні товару')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      category_id: '',
      unit_id: '',
      product_type: 'consumable',
      description: '',
      min_stock_level: 0,
      is_active: true,
    })
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Редагувати товар' : 'Новий товар'}</DialogTitle>
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
                label="Назва товару"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  select
                  label="Категорія"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton
                  color="primary"
                  onClick={handleCreateCategory}
                  title="Створити нову категорію"
                  sx={{ mt: 1 }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  select
                  label="Одиниця виміру"
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleChange}
                  required
                >
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.name} ({unit.short_name})
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton
                  color="primary"
                  onClick={handleCreateUnit}
                  title="Створити нову одиницю виміру"
                  sx={{ mt: 1 }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Тип"
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
              >
                <MenuItem value="consumable">Витратний матеріал</MenuItem>
                <MenuItem value="spare_part">Запчастина</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Мінімальний залишок"
                name="min_stock_level"
                value={formData.min_stock_level}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Опис"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
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
