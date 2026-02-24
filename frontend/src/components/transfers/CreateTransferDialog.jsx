import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { productsAPI } from '../../api/products'
import { departmentsAPI } from '../../api/departments'
import { transfersAPI } from '../../api/transfers'

const CreateTransferDialog = ({ open, onClose, onSuccess }) => {
  const [products, setProducts] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    from_department_id: '',
    to_department_id: '',
    notes: '',
  })

  const [items, setItems] = useState([
    { product_id: '', quantity: '', notes: '' },
  ])

  useEffect(() => {
    if (open) {
      loadReferenceData()
    }
  }, [open])

  const loadReferenceData = async () => {
    try {
      const [productsData, departmentsData] = await Promise.all([
        productsAPI.list(),
        departmentsAPI.list(),
      ])
      setProducts(productsData)
      setDepartments(departmentsData)
    } catch (err) {
      alert('Failed to load data: ' + err.message)
    }
  }

  const handleAddItem = () => {
    setItems([...items, { product_id: '', quantity: '', notes: '' }])
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validate
      if (!formData.from_department_id || !formData.to_department_id) {
        alert('Заповніть всі обов\'язкові поля')
        return
      }

      if (formData.from_department_id === formData.to_department_id) {
        alert('Підрозділи не можуть бути однаковими')
        return
      }

      if (items.length === 0 || items.some(i => !i.product_id || !i.quantity)) {
        alert('Додайте мінімум один товар з коректними даними')
        return
      }

      const data = {
        ...formData,
        from_department_id: parseInt(formData.from_department_id),
        to_department_id: parseInt(formData.to_department_id),
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          notes: item.notes || null,
        })),
      }

      await transfersAPI.create(data)
      onSuccess()
      handleClose()
    } catch (err) {
      alert('Помилка створення переміщення: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      from_department_id: '',
      to_department_id: '',
      notes: '',
    })
    setItems([{ product_id: '', quantity: '', notes: '' }])
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Нове переміщення</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Header fields */}
          <TextField
            label="Дата"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            fullWidth
            required
          />

          <TextField
            select
            label="З підрозділу"
            value={formData.from_department_id}
            onChange={(e) => setFormData({ ...formData, from_department_id: e.target.value })}
            fullWidth
            required
          >
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="На підрозділ"
            value={formData.to_department_id}
            onChange={(e) => setFormData({ ...formData, to_department_id: e.target.value })}
            fullWidth
            required
          >
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Примітки"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />

          {/* Items */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">Позиції</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddItem}>
                Додати товар
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell>Кількість</TableCell>
                  <TableCell>Примітки</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        size="small"
                        fullWidth
                        required
                      >
                        {products.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        size="small"
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Скасувати</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Створення...' : 'Створити'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateTransferDialog
