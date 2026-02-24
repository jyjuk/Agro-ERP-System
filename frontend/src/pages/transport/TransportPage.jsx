import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, TablePagination, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, Alert, Snackbar,
  Grid, Card, CardContent
} from '@mui/material'
import { usePagination } from '../../hooks/usePagination'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as CarIcon,
  Search as SearchIcon,
  Agriculture as TractorIcon,
  LocalShipping as TruckIcon,
} from '@mui/icons-material'
import { transportAPI } from '../../api/transport'
import TransportDialog from '../../components/transport/TransportDialog'

const TYPE_COLOR = {
  'авто': 'primary',
  'трактор': 'success',
  'тягач': 'warning',
  'спецтехніка': 'secondary',
  'бочка': 'default',
  'причіп': 'default',
  'інше': 'default',
}

const TransportPage = () => {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUnit, setEditUnit] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(25)

  const load = async () => {
    try {
      setLoading(true)
      const data = await transportAPI.list()
      setUnits(data)
    } catch (e) {
      showSnack('Помилка завантаження', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity })

  const handleAdd = () => {
    setEditUnit(null)
    setDialogOpen(true)
  }

  const handleEdit = (unit) => {
    setEditUnit(unit)
    setDialogOpen(true)
  }

  const handleSave = async (data) => {
    try {
      if (editUnit) {
        await transportAPI.update(editUnit.id, data)
        showSnack('Збережено')
      } else {
        await transportAPI.create(data)
        showSnack('Додано')
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      showSnack('Помилка збереження', 'error')
    }
  }

  const handleDeleteClick = (unit) => {
    setDeleteTarget(unit)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await transportAPI.delete(deleteTarget.id)
      showSnack(`${deleteTarget.name} видалено`)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      load()
    } catch (e) {
      showSnack('Помилка видалення', 'error')
    }
  }

  const filtered = units.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.unit_type.toLowerCase().includes(search.toLowerCase()) ||
    (u.plate_number || '').toLowerCase().includes(search.toLowerCase())
  )

  // Групуємо по типу для карток
  const byType = units.reduce((acc, u) => {
    acc[u.unit_type] = (acc[u.unit_type] || 0) + 1
    return acc
  }, {})

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Транспорт</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          Додати
        </Button>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" color="primary">{units.length}</Typography>
              <Typography variant="body2" color="text.secondary">Всього одиниць</Typography>
            </CardContent>
          </Card>
        </Grid>
        {Object.entries(byType).map(([type, count]) => (
          <Grid item xs={6} sm={3} key={type}>
            <Card>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4">{count}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{type}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Пошук за назвою, типом, номером..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 320 }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Назва</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Держ. номер</TableCell>
                <TableCell>Примітки</TableCell>
                <TableCell align="right">Дії</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {loading ? 'Завантаження...' : 'Немає транспортних одиниць. Натисніть "+ Додати"'}
                  </TableCell>
                </TableRow>
              )}
              {paginate(filtered).map(unit => (
                <TableRow key={unit.id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{unit.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={unit.unit_type}
                      size="small"
                      color={TYPE_COLOR[unit.unit_type] || 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{unit.plate_number || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {unit.notes || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(unit)} title="Редагувати">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(unit)} title="Видалити">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Рядків на сторінці:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} з ${count}`}
          />
        </TableContainer>
      </Paper>

      {/* Add/Edit dialog */}
      <TransportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        unit={editUnit}
      />

      {/* Delete confirm */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs">
        <DialogTitle>Видалити транспортну одиницю?</DialogTitle>
        <DialogContent>
          <Typography>
            Підтвердіть видалення: <strong>{deleteTarget?.name}</strong> ({deleteTarget?.unit_type})
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Скасувати</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>Видалити</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TransportPage
