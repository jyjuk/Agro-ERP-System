import { useState } from 'react'

/**
 * Хук для client-side пагінації таблиць.
 * Повертає paginate(items) — зрізає масив під поточну сторінку.
 */
export const usePagination = (defaultRowsPerPage = 25) => {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage)

  const handleChangePage = (_, newPage) => setPage(newPage)

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  const paginate = (items) =>
    items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const reset = () => setPage(0)

  return { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate, reset }
}
