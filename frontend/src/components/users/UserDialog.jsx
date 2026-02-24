import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material'
import { usersAPI } from '../../api/users'
import { departmentsAPI } from '../../api/departments'

export default function UserDialog({ open, onClose, onSuccess, user = null }) {
  const isEdit = !!user

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role_id: '',
    department_id: '',
    is_active: true,
  })
  const [roles, setRoles] = useState([])
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadRoles()
      loadDepartments()

      if (isEdit && user) {
        setFormData({
          username: user.username,
          password: '', // Don't prefill password
          role_id: user.role_id,
          department_id: user.department_id,
          is_active: user.is_active,
        })
      }
    }
  }, [open, user])

  const loadRoles = async () => {
    try {
      const data = await usersAPI.getRoles()
      setRoles(data)
    } catch (err) {
      console.error('Failed to load roles:', err)
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
    const { name, value, checked } = e.target
    setFormData({
      ...formData,
      [name]: name === 'is_active' ? checked : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate
      if (!formData.username) {
        setError("Введіть ім'я користувача")
        setLoading(false)
        return
      }

      if (!isEdit && !formData.password) {
        setError('Введіть пароль')
        setLoading(false)
        return
      }

      if (!formData.role_id) {
        setError('Виберіть роль')
        setLoading(false)
        return
      }

      const selectedRole = roles.find((r) => r.id === parseInt(formData.role_id))
      const needsDept = selectedRole?.name === 'department_head'

      if (needsDept && !formData.department_id) {
        setError('Виберіть підрозділ для старшого підрозділу')
        setLoading(false)
        return
      }

      const payload = {
        username: formData.username,
        role_id: parseInt(formData.role_id),
        department_id: needsDept ? parseInt(formData.department_id) : null,
        is_active: formData.is_active,
      }

      // Only include password if it's set
      if (formData.password) {
        payload.password = formData.password
      }

      if (isEdit) {
        await usersAPI.update(user.id, payload)
      } else {
        await usersAPI.create(payload)
      }

      onSuccess()
      handleClose()
    } catch (err) {
      console.error('Failed to save user:', err)
      setError(err.response?.data?.detail || 'Помилка при збереженні користувача')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      username: '',
      password: '',
      role_id: '',
      department_id: '',
      is_active: true,
    })
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Редагувати користувача' : 'Новий користувач'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Ім'я користувача"
            name="username"
            value={formData.username}
            onChange={handleChange}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label={isEdit ? 'Новий пароль (залиште порожнім, щоб не змінювати)' : 'Пароль'}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required={!isEdit}
          />

          <TextField
            fullWidth
            select
            label="Роль"
            name="role_id"
            value={formData.role_id}
            onChange={handleChange}
            margin="normal"
            required
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name} {role.description && `- ${role.description}`}
              </MenuItem>
            ))}
          </TextField>

          {roles.find((r) => r.id === parseInt(formData.role_id))?.name === 'department_head' && (
            <TextField
              fullWidth
              select
              label="Підрозділ"
              name="department_id"
              value={formData.department_id}
              onChange={handleChange}
              margin="normal"
              required
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={handleChange}
                name="is_active"
              />
            }
            label="Активний"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Збереження...' : isEdit ? 'Оновити' : 'Створити'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
