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
import { usersAPI } from '../../api/users'
import UserDialog from '../../components/users/UserDialog'

export default function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(25)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersAPI.list()
      setUsers(data)
      setError('')
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Помилка завантаження користувачів')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setDialogOpen(true)
  }

  const handleEdit = (user) => {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Видалити користувача "${user.username}"?`)) {
      return
    }

    try {
      await usersAPI.delete(user.id)
      loadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert(err.response?.data?.detail || 'Помилка при видаленні користувача')
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedUser(null)
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Користувачі</Typography>
        <Button variant="contained" onClick={handleCreate}>
          + Новий користувач
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
              <TableCell>Ім'я користувача</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Підрозділ</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="center">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Немає користувачів
                </TableCell>
              </TableRow>
            ) : (
              paginate(users).map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role?.name || '-'}
                      color={user.role?.name === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.department?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Активний' : 'Неактивний'}
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(user)}
                      title="Редагувати"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(user)}
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
          count={users.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Рядків на сторінці:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} з ${count}`}
        />
      </TableContainer>

      <UserDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSuccess={loadUsers}
        user={selectedUser}
      />
    </Container>
  )
}
