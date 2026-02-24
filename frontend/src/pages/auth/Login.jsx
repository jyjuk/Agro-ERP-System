import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material'
import { useAuth } from '../../context/AuthContext'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      console.error('Error response:', err.response?.data)

      // Handle FastAPI validation errors (422)
      let errorMsg = 'Login failed. Please try again.'

      if (err.response?.data?.detail) {
        const detail = err.response.data.detail

        // If detail is an array (Pydantic validation errors)
        if (Array.isArray(detail)) {
          errorMsg = detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join('; ')
        }
        // If detail is a string
        else if (typeof detail === 'string') {
          errorMsg = detail
        }
      } else if (err.message) {
        errorMsg = err.message
      }

      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={10} sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Agro ERP System
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" gutterBottom>
            Вхід в систему
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Ім'я користувача"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            Ім'я: admin | Пароль: admin
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}

export default Login
