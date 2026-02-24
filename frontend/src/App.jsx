import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import AppRoutes from './routes/AppRoutes'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Green for agro business
    },
    secondary: {
      main: '#ff6f00',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRoutes />
    </ThemeProvider>
  )
}

export default App
