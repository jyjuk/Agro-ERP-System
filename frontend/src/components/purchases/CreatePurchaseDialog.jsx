import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Autocomplete,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { suppliersAPI } from '../../api/suppliers'
import { productsAPI } from '../../api/products'
import { departmentsAPI } from '../../api/departments'
import { purchasesAPI } from '../../api/purchases'

const emptyItem = { product_id: '', quantity: '', unit_price: '', notes: '' }

const CreatePurchaseDialog = ({ open, onClose, onSuccess, editPurchase }) => {
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

  const [items, setItems] = useState([emptyItem])

  const isEdit = Boolean(editPurchase)
  const isConfirmed = editPurchase?.status === 'confirmed'

  useEffect(() => {
    if (open) {
      loadReferenceData()
    }
  }, [open])

  // Заповнюємо форму при відкритті в режимі редагування
  useEffect(() => {
    if (open && editPurchase) {
      setFormData({
        date: editPurchase.date ? String(editPurchase.date).split('T')[0] : '',
        supplier_id: editPurchase.supplier_id,
        department_id: editPurchase.department_id,
        notes: editPurchase.notes || '',
      })
      setItems(
        editPurchase.items.map(i => ({
          product_id: i.product_id,
          quantity: String(i.quantity),
          unit_price: String(i.unit_price),
          notes: i.notes || '',
        }))
      )
    } else if (open && !editPurchase) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        department_id: '',
        notes: '',
      })
      setItems([emptyItem])
    }
  }, [open, editPurchase])

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

  const handleAddItem = () => setItems([...items, { ...emptyItem }])

  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index))

  const handleItemChange = (index, field, value) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const calculateTotal = () =>
    items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
    }, 0)

  const handleSubmit = async () => {
    try {
      setLoading(true)

      if (!formData.date) {
        alert('Оберіть дату')
        return
      }

      if (!formData.supplier_id || !formData.department_id) {
        alert('Заповніть всі обов\'язкові поля')
        return
      }

      if (!isConfirmed && (items.length === 0 || items.some(i => !i.product_id || !i.quantity || !i.unit_price))) {
        alert('Додайте мінімум один товар з коректними даними')
        return
      }

      // Для підтвердженої — тільки дата, постачальник, примітки (без позицій і підрозділу)
      const safeDate = formData.date ? String(formData.date).split('T')[0] : formData.date
      const payload = isConfirmed
        ? {
            date: safeDate,
            supplier_id: parseInt(formData.supplier_id),
            notes: formData.notes || null,
          }
        : {
            date: safeDate,
            supplier_id: parseInt(formData.supplier_id),
            department_id: parseInt(formData.department_id),
            notes: formData.notes || null,
            items: items.map(item => ({
              product_id: parseInt(item.product_id),
              quantity: parseFloat(item.quantity),
              unit_price: parseFloat(item.unit_price),
              notes: item.notes || null,
            })),
          }

      if (isEdit) {
        await purchasesAPI.update(editPurchase.id, payload)
      } else {
        await purchasesAPI.create(payload)
      }

      onSuccess()
      handleClose()
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => {
            const loc = d.loc ? d.loc.filter(x => x !== 'body').join('.') : ''
            return loc ? `${loc}: ${d.msg}` : (d.msg || JSON.stringify(d))
          }).join('; ')
        : (typeof detail === 'string' ? detail : err.message)
      alert('Помилка: ' + msg)
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
    setItems([emptyItem])
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? `Редагувати закупівлю ${editPurchase?.number}` : 'Нова закупівля'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Дата"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            fullWidth
            required
          />

          <Autocomplete
            options={suppliers}
            getOptionLabel={(opt) => opt.name || ''}
            value={suppliers.find(s => s.id === formData.supplier_id) || null}
            onChange={(_, newVal) => setFormData({ ...formData, supplier_id: newVal?.id || '' })}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => <TextField {...params} label="Постачальник" required />}
          />

          <Autocomplete
            options={departments}
            getOptionLabel={(opt) => opt.name || ''}
            value={departments.find(d => d.id === formData.department_id) || null}
            onChange={(_, newVal) => setFormData({ ...formData, department_id: newVal?.id || '' })}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => <TextField {...params} label="Підрозділ (куди оприбуткувати)" required />}
          />

          <TextField
            label="Примітки"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />

          {isConfirmed && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Закупівля підтверджена — можна змінити лише дату, постачальника та примітки.
            </Typography>
          )}

          {!isConfirmed && (
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
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        size="small"
                        required
                        inputProps={{ min: 0, step: 0.001 }}
                        sx={{ width: 100 }}
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
                        sx={{ width: 110 }}
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
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Скасувати</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Збереження...' : isEdit ? 'Зберегти' : 'Створити'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreatePurchaseDialog
