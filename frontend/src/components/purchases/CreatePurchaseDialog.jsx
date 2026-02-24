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
import { suppliersAPI } from '../../api/suppliers'
import { productsAPI } from '../../api/products'
import { departmentsAPI } from '../../api/departments'
import { purchasesAPI } from '../../api/purchases'

const CreatePurchaseDialog = ({ open, onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    department_id: '',
    notes: '',
  })

  const [items, setItems] = useState([
    { product_id: '', quantity: '', unit_price: '' },
  ])

  useEffect(() => {
    if (open) {
      loadReferenceData()
    }
  }, [open])

  const loadReferenceData = async () => {
    try {
      const [suppliersData, productsData, departmentsData] = await Promise.all([
        suppliersAPI.list(),
        productsAPI.list(),
        departmentsAPI.list(),
      ])
      setSuppliers(suppliersData)
      setProducts(productsData)
      setDepartments(departmentsData)
    } catch (err) {
      alert('Failed to load data: ' + err.message)
    }
  }

  const handleAddItem = () => {
    setItems([...items, { product_id: '', quantity: '', unit_price: '' }])
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      return sum + qty * price
    }, 0)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validate
      if (!formData.supplier_id || !formData.department_id) {
        alert('Заповніть всі обов\'язкові поля')
        return
      }

      if (items.length === 0 || items.some(i => !i.product_id || !i.quantity || !i.unit_price)) {
        alert('Додайте мінімум один товар з коректними даними')
        return
      }

      const data = {
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        department_id: parseInt(formData.department_id),
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          notes: item.notes || null,
        })),
      }

      await purchasesAPI.create(data)
      onSuccess()
      handleClose()
    } catch (err) {
      alert('Помилка створення закупівлі: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      supplier_id: '',
      department_id: '',
      notes: '',
    })
    setItems([{ product_id: '', quantity: '', unit_price: '' }])
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Нова закупівля</DialogTitle>
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
            label="Постачальник"
            value={formData.supplier_id}
            onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
            fullWidth
            required
          >
            {suppliers.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Підрозділ (куди оприбуткувати)"
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
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
                  <TableCell>Ціна</TableCell>
                  <TableCell>Сума</TableCell>
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
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        size="small"
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)} ₴
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
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <strong>Всього:</strong>
                  </TableCell>
                  <TableCell>
                    <strong>{calculateTotal().toFixed(2)} ₴</strong>
                  </TableCell>
                  <TableCell />
                </TableRow>
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

export default CreatePurchaseDialog
