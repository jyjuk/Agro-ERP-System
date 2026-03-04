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
import { productsAPI } from '../../api/products'
import { departmentsAPI } from '../../api/departments'
import { transfersAPI } from '../../api/transfers'
import { inventoryAPI } from '../../api/inventory'

const CreateTransferDialog = ({ open, onClose, onSuccess }) => {
  const [products, setProducts] = useState([])
  const [departments, setDepartments] = useState([])
  const [deptInventory, setDeptInventory] = useState({}) // product_id -> available quantity
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

  // Завантажуємо залишки при зміні підрозділу-джерела
  useEffect(() => {
    if (formData.from_department_id) {
      loadDeptInventory(formData.from_department_id)
    } else {
      setDeptInventory({})
    }
  }, [formData.from_department_id])

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

  const loadDeptInventory = async (departmentId) => {
    try {
      const invData = await inventoryAPI.list({ department_id: departmentId, show_zero: false })
      const map = {}
      invData.forEach(inv => {
        map[inv.product_id] = parseFloat(inv.quantity)
      })
      setDeptInventory(map)
    } catch {
      setDeptInventory({})
    }
  }

  const getAvailable = (productId) => {
    if (!formData.from_department_id || !productId) return null
    const qty = deptInventory[productId]
    return qty !== undefined ? qty : 0
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

      // Клієнтська перевірка залишків
      for (const item of items) {
        if (!item.product_id || !item.quantity) continue
        const available = getAvailable(parseInt(item.product_id))
        if (available !== null && parseFloat(item.quantity) > available) {
          const product = products.find(p => p.id === parseInt(item.product_id))
          alert(`Недостатньо запасів: "${product?.name}"\nПотрібно: ${item.quantity}, є: ${available}`)
          return
        }
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
      alert('Помилка створення переміщення: ' + (err?.response?.data?.detail || err.message))
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
    setDeptInventory({})
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Нове переміщення</DialogTitle>
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
            options={departments}
            getOptionLabel={(opt) => opt.name || ''}
            value={departments.find(d => d.id === formData.from_department_id) || null}
            onChange={(_, newVal) => setFormData({ ...formData, from_department_id: newVal?.id || '' })}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => <TextField {...params} label="З підрозділу" required />}
          />

          <Autocomplete
            options={departments}
            getOptionLabel={(opt) => opt.name || ''}
            value={departments.find(d => d.id === formData.to_department_id) || null}
            onChange={(_, newVal) => setFormData({ ...formData, to_department_id: newVal?.id || '' })}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => <TextField {...params} label="На підрозділ" required />}
          />

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
                  <TableCell width={130}>Кількість</TableCell>
                  <TableCell>Примітки</TableCell>
                  <TableCell width={36}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const available = getAvailable(parseInt(item.product_id))
                  const qty = parseFloat(item.quantity)
                  const isOver = available !== null && item.quantity && qty > available
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Autocomplete
                          options={products}
                          getOptionLabel={(opt) => opt.name || ''}
                          value={products.find(p => p.id === parseInt(item.product_id)) || null}
                          onChange={(_, newVal) => handleItemChange(index, 'product_id', newVal?.id || '')}
                          isOptionEqualToValue={(opt, val) => opt.id === val.id}
                          renderOption={(props, option) => {
                            const avail = formData.from_department_id ? (deptInventory[option.id] ?? 0) : null
                            return (
                              <li {...props} key={option.id}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                  <span>{option.name}</span>
                                  {avail !== null && (
                                    <Typography variant="caption" color={avail > 0 ? 'success.main' : 'error.main'} sx={{ whiteSpace: 'nowrap' }}>
                                      є: {avail}
                                    </Typography>
                                  )}
                                </Box>
                              </li>
                            )
                          }}
                          renderInput={(params) => <TextField {...params} size="small" required placeholder="Оберіть товар" />}
                        />
                        {item.product_id && available !== null && (
                          <Typography variant="caption" color={available > 0 ? 'text.secondary' : 'error.main'}>
                            Доступно: {available}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          size="small"
                          required
                          error={isOver}
                          helperText={isOver ? `макс. ${available}` : ''}
                          inputProps={{ min: 0.001, step: 0.001 }}
                          sx={{ width: 120 }}
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
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Скасувати</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || items.some(i => {
            const avail = getAvailable(parseInt(i.product_id))
            return avail !== null && i.quantity && parseFloat(i.quantity) > avail
          })}
        >
          {loading ? 'Створення...' : 'Створити'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateTransferDialog
