import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, MenuItem, Chip, CircularProgress,
  Collapse, IconButton, Tooltip, TablePagination,
} from '@mui/material'
import {
  History as HistoryIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
} from '@mui/icons-material'
import { auditAPI } from '../../api/audit'

const ACTION_COLORS = {
  login:             'success',
  logout:            'default',
  purchase_confirm:  'primary',
  transfer_confirm:  'info',
  writeoff_confirm:  'error',
  inventory_approve: 'warning',
  create:            'success',
  update:            'info',
  delete:            'error',
}

const ENTITY_ICONS = {
  purchase:        '🛒',
  transfer:        '📦',
  writeoff:        '🗑️',
  inventory_count: '📋',
  product:         '🔧',
  supplier:        '🏭',
  user:            '👤',
  auth:            '🔐',
}

function ChangesCell({ changes }) {
  const [open, setOpen] = useState(false)
  if (!changes || Object.keys(changes).length === 0) return <span>—</span>

  const keys = Object.keys(changes)
  const preview = keys.slice(0, 1).map(k => {
    const v = changes[k]
    if (v && typeof v === 'object' && 'old' in v && 'new' in v) {
      return `${k}: ${v.old} → ${v.new}`
    }
    return `${k}: ${JSON.stringify(v)}`
  }).join(', ')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          {preview}{keys.length > 1 ? ` +${keys.length - 1}` : ''}
        </Typography>
        {keys.length > 1 && (
          <IconButton size="small" onClick={() => setOpen(o => !o)}>
            {open ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 0.5, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          {keys.map(k => {
            const v = changes[k]
            const isChange = v && typeof v === 'object' && 'old' in v && 'new' in v
            return (
              <Typography key={k} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                {isChange ? `${k}: ${v.old} → ${v.new}` : `${k}: ${JSON.stringify(v)}`}
              </Typography>
            )
          })}
        </Box>
      </Collapse>
    </Box>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function AuditPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ users: [], actions: [], entity_types: [] })
  const [loading, setLoading] = useState(false)

  const [userId, setUserId]     = useState('')
  const [action, setAction]     = useState('')
  const [entityType, setEntityType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const [page, setPage]         = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        ...(userId     && { user_id: userId }),
        ...(action     && { action }),
        ...(entityType && { entity_type: entityType }),
        ...(dateFrom   && { date_from: dateFrom }),
        ...(dateTo     && { date_to: dateTo }),
      }
      const data = await auditAPI.getLog(params)
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, userId, action, entityType, dateFrom, dateTo])

  useEffect(() => {
    auditAPI.getMeta().then(setMeta).catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value)
    setPage(0)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <HistoryIcon color="action" fontSize="large" />
        <Typography variant="h4">Журнал змін</Typography>
      </Box>

      {/* Фільтри */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            select size="small" label="Користувач" value={userId}
            onChange={handleFilterChange(setUserId)} sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Всі</MenuItem>
            {meta.users.map(u => (
              <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="small" label="Дія" value={action}
            onChange={handleFilterChange(setAction)} sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Всі дії</MenuItem>
            {meta.actions.map(a => (
              <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="small" label="Об'єкт" value={entityType}
            onChange={handleFilterChange(setEntityType)} sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Всі об'єкти</MenuItem>
            {meta.entity_types.map(e => (
              <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            type="date" size="small" label="Від"
            value={dateFrom} onChange={handleFilterChange(setDateFrom)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
          />
          <TextField
            type="date" size="small" label="До"
            value={dateTo} onChange={handleFilterChange(setDateTo)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
          />
        </Box>
      </Paper>

      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Дата / час</TableCell>
                    <TableCell>Користувач</TableCell>
                    <TableCell>Дія</TableCell>
                    <TableCell>Об'єкт</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Деталі</TableCell>
                    <TableCell>IP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        Записів не знайдено
                      </TableCell>
                    </TableRow>
                  ) : rows.map(row => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                        {fmtDate(row.created_at)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{row.username}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.action_label}
                          color={ACTION_COLORS[row.action] || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{ENTITY_ICONS[row.entity_type] || '📄'}</span>
                          <Typography variant="body2">{row.entity_label}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {row.entity_id ? (
                          <Tooltip title={`ID: ${row.entity_id}`}>
                            <Typography variant="caption" color="text.secondary">
                              #{row.entity_id}
                            </Typography>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <ChangesCell changes={row.changes} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {row.ip_address || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={-1}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0) }}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Рядків:"
              labelDisplayedRows={({ from, to }) => `${from}–${to}`}
              nextIconButtonProps={{ disabled: rows.length < rowsPerPage }}
            />
          </>
        )}
      </Paper>
    </Box>
  )
}
