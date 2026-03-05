import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Alert,
} from '@mui/material'
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { writeoffsAPI } from '../../api/writeoffs'
import { productsAPI } from '../../api/products'
import { departmentsAPI } from '../../api/departments'
import { useAuth } from '../../context/AuthContext'

export default function CreateWriteOffDialog({ open, onClose, onSuccess }) {
  const { user, isDepartmentHead } = useAuth()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    department_id: '',
    reason: '',
    notes: '',
  })
  const [items, setItems] = useState([
    { product_id: '', quantity: '' },
  ])
  const [products, setProducts] = useState([])
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadProducts()
      loadDepartments()
      // department_user: автоматично встановити свій підрозділ
      if (isDepartmentHead() && user?.department_id) {
        setFormData((f) => ({ ...f, department_id: user.department_id }))
      }
    }
  }, [open])

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll()
      setProducts(data)
    } catch (err) {
      console.error('Failed to load products:', err)
    }
  }

  const loadDepartments = async () => {
    try {
      const data = await departmentsAPI.getAll()
      setDepartments(data)
    } catch (err) {
      console.error('Failed to load departments:', err)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleItemChange = (index, field, value) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleAddItem = () => {
    setItems([...items, { product_id: '', quantity: '' }])
  }

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      setItems(newItems)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate
      if (!formData.department_id) {
        setError('Виберіть підрозділ')
        setLoading(false)
        return
      }

      if (!formData.reason) {
        setError('Вкажіть причину списання')
        setLoading(false)
        return
      }

      const validItems = items.filter(
        (item) => item.product_id && item.quantity
      )

      if (validItems.length === 0) {
        setError('Додайте хоча б одну позицію')
        setLoading(false)
        return
      }

      const payload = {
        ...formData,
        department_id: parseInt(formData.department_id),
        items: validItems.map((item) => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          notes: item.notes || null,
        })),
      }

      await writeoffsAPI.create(payload)
      onSuccess()
      handleClose()
    } catch (err) {
      console.error('Failed to create write-off:', err)
      setError(err.response?.data?.detail || 'Помилка при створенні списання')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      department_id: '',
      reason: '',
      notes: '',
    })
    setItems([{ product_id: '', quantity: '' }])
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Нове списання</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Дата"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />

          <Autocomplete
            options={departments}
            getOptionLabel={(opt) => opt.name || ''}
            value={departments.find(d => d.id === formData.department_id) || null}
            onChange={(_, newVal) => setFormData({ ...formData, department_id: newVal?.id || '' })}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            disabled={isDepartmentHead()}
            sx={{ mt: 1, mb: 0.5 }}
            renderInput={(params) => <TextField {...params} label="Підрозділ" required margin="normal" />}
          />

          <TextField
            fullWidth
            label="Причина списання"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            margin="normal"
            required
            placeholder="Наприклад: Псування, Втрата, Списання застарілих товарів"
          />

          <TextField
            fullWidth
            label="Примітки"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />

          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <strong>Позиції списання</strong>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddItem}
                variant="outlined"
                size="small"
              >
                Додати позицію
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell>Кількість</TableCell>
                  <TableCell>Примітки</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Autocomplete
                        options={products}
                        getOptionLabel={(opt) => opt.name || ''}
                        value={products.find(p => p.id === parseInt(item.product_id)) || null}
                        onChange={(_, newVal) => handleItemChange(index, 'product_id', newVal?.id || '')}
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        renderInput={(params) => <TextField {...params} size="small" required placeholder="Оберіть товар" />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', e.target.value)
                        }
                        inputProps={{ step: '0.001', min: '0' }}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={item.notes || ''}
                        onChange={(e) =>
                          handleItemChange(index, 'notes', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Збереження...' : 'Створити'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
