import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
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
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
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

          <TextField
            fullWidth
            select
            label="Підрозділ"
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            margin="normal"
            required
            disabled={isDepartmentHead()}
          >
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </TextField>

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
                      <TextField
                        fullWidth
                        select
                        size="small"
                        value={item.product_id}
                        onChange={(e) =>
                          handleItemChange(index, 'product_id', e.target.value)
                        }
                        required
                      >
                        {products.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.name}
                          </MenuItem>
                        ))}
                      </TextField>
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
