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
import { productsAPI } from '../../api/products'
import ProductDialog from '../../components/products/ProductDialog'

export default function ProductsList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(25)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productsAPI.list()
      setProducts(data)
      setError('')
    } catch (err) {
      console.error('Failed to load products:', err)
      setError('Помилка завантаження товарів')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedProduct(null)
    setDialogOpen(true)
  }

  const handleEdit = (product) => {
    setSelectedProduct(product)
    setDialogOpen(true)
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Видалити товар "${product.name}"?`)) {
      return
    }

    try {
      await productsAPI.delete(product.id)
      loadProducts()
    } catch (err) {
      console.error('Failed to delete product:', err)
      alert(err.response?.data?.detail || 'Помилка при видаленні товару')
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedProduct(null)
  }

  const getProductTypeLabel = (type) => {
    const types = {
      consumable: 'Витратний матеріал',
      spare_part: 'Запчастина',
    }
    return types[type] || type
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Товари / Матеріали</Typography>
        <Button variant="contained" onClick={handleCreate}>
          + Новий товар
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
              <TableCell>Категорія</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Одиниця виміру</TableCell>
              <TableCell>Мін. залишок</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="center">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Немає товарів
                </TableCell>
              </TableRow>
            ) : (
              paginate(products).map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category?.name || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getProductTypeLabel(product.product_type)}
                      color={product.product_type === 'consumable' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{product.unit?.short_name || '—'}</TableCell>
                  <TableCell>{product.min_stock_level || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.is_active ? 'Активний' : 'Неактивний'}
                      color={product.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(product)}
                      title="Редагувати"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(product)}
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
          count={products.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Рядків на сторінці:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} з ${count}`}
        />
      </TableContainer>

      <ProductDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSuccess={loadProducts}
        product={selectedProduct}
      />
    </Container>
  )
}
