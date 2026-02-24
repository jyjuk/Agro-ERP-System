import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Box,
  Alert,
  IconButton,
} from '@mui/material'
import { usePagination } from '../../hooks/usePagination'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { suppliersAPI } from '../../api/suppliers'
import SupplierDialog from '../../components/suppliers/SupplierDialog'

export default function SuppliersList() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(25)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const data = await suppliersAPI.list()
      setSuppliers(data)
      setError('')
    } catch (err) {
      console.error('Failed to load suppliers:', err)
      setError('Помилка завантаження постачальників')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedSupplier(null)
    setDialogOpen(true)
  }

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier)
    setDialogOpen(true)
  }

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Видалити постачальника "${supplier.name}"?`)) {
      return
    }

    try {
      await suppliersAPI.delete(supplier.id)
      loadSuppliers()
    } catch (err) {
      console.error('Failed to delete supplier:', err)
      alert(err.response?.data?.detail || 'Помилка при видаленні постачальника')
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedSupplier(null)
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Постачальники</Typography>
        <Button variant="contained" onClick={handleCreate}>
          + Новий постачальник
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Назва</TableCell>
              <TableCell>Контактна особа</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>ЄДРПОУ/ІПН</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="center">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Немає постачальників
                </TableCell>
              </TableRow>
            ) : (
              paginate(suppliers).map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.contact_person || '—'}</TableCell>
                  <TableCell>{supplier.phone || '—'}</TableCell>
                  <TableCell>{supplier.tax_id || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={supplier.is_active ? 'Активний' : 'Неактивний'}
                      color={supplier.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(supplier)}
                      title="Редагувати"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(supplier)}
                      title="Видалити"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={suppliers.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Рядків на сторінці:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} з ${count}`}
        />
      </TableContainer>

      <SupplierDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSuccess={loadSuppliers}
        supplier={selectedSupplier}
      />
    </Container>
  )
}
