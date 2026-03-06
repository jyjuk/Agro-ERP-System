import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Divider,
  Chip,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from '@mui/material'
import { ElectricBolt as BoltIcon, Construction as ConstructionIcon } from '@mui/icons-material'

// Формула розрахунку:
// КТП1 + КТП2 = Загальне споживання
// Млин = Лічильник_млин1 + Лічильник_млин2 × К2
// Пелетний = Лічильник_пелет × К_пелет
// Елеватор + офіс + склад гот.прод. = Загальне - Млин - Пелетний

const InputField = ({ label, value, unit = 'кВт·год', coeff, disabled = true }) => (
  <Box>
    <TextField
      fullWidth
      label={label}
      value={value ?? ''}
      size="small"
      disabled={disabled}
      InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">{unit}</Typography> }}
    />
    {coeff && (
      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
        × коефіцієнт {coeff}
      </Typography>
    )}
  </Box>
)

export default function ElectricityPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <BoltIcon color="warning" />
        <Typography variant="h4">Електроенергія</Typography>
        <Chip
          icon={<ConstructionIcon />}
          label="В розробці"
          color="warning"
          size="small"
          sx={{ ml: 1 }}
        />
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Модуль в розробці. Нижче — структура розрахунку. Після реалізації тут можна буде
        вводити показники лічильників і бачити розподіл по споживачах.
      </Alert>

      {/* Схема розрахунку */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Схема розрахунку</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Споживач</TableCell>
                <TableCell>Джерело даних</TableCell>
                <TableCell>Формула</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ bgcolor: 'primary.50' }}>
                <TableCell><strong>Загальне (КТП1 + КТП2)</strong></TableCell>
                <TableCell>2 зовнішніх лічильники</TableCell>
                <TableCell>КТП1 + КТП2</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Млин + склад готової продукції</TableCell>
                <TableCell>2 внутрішні лічильники (один з коефіцієнтом)</TableCell>
                <TableCell>Л_млин1 + Л_млин2 × К</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Пелетний цех</TableCell>
                <TableCell>1 лічильник з коефіцієнтом</TableCell>
                <TableCell>Л_пелет × К</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'success.50' }}>
                <TableCell><strong>Елеватор + офіс</strong></TableCell>
                <TableCell>Розрахункова величина</TableCell>
                <TableCell>Загальне − Млин − Пелетний</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Макет введення даних */}
      <Grid container spacing={3}>
        {/* КТП */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Введення показників
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>КТП (загальне)</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <InputField label="КТП 1" />
              </Grid>
              <Grid item xs={6}>
                <InputField label="КТП 2" />
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Млин + склад готової продукції</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <InputField label="Лічильник 1 (млин)" />
              </Grid>
              <Grid item xs={6}>
                <InputField label="Лічильник 2 (млин)" coeff="—" />
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Пелетний цех</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <InputField label="Лічильник (пелетний)" coeff="—" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Результати */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Результати розподілу
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <InputField label="Загальне КТП1 + КТП2" />
              </Grid>
              <Grid item xs={12}>
                <InputField label="Млин + склад готової продукції" />
              </Grid>
              <Grid item xs={12}>
                <InputField label="Пелетний цех" />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Елеватор + офіс (розрахункове)"
                  size="small"
                  disabled
                  InputProps={{
                    endAdornment: <Typography variant="caption" color="text.secondary">кВт·год</Typography>,
                    sx: { bgcolor: 'success.50' }
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
