import { createContext, useState, useContext, useEffect } from 'react'
import { authAPI } from '../api/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user_data')
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (err) {
        console.error('Failed to parse user data:', err)
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_data')
      }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const data = await authAPI.login(username, password)
    localStorage.setItem('access_token', data.access_token)
    if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user_data', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = () => {
    authAPI.logout()
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
    setUser(null)
  }

  const isAdmin = () => {
    return user?.role?.name === 'admin'
  }

  const isManager = () => {
    return user?.role?.name === 'manager'
  }

  const isWarehouseManager = () => {
    return user?.role?.name === 'warehouse_manager'
  }

  const isDepartmentHead = () => {
    return user?.role?.name === 'department_head'
  }

  const isAccountant = () => {
    return user?.role?.name === 'accountant'
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin,
    isManager,
    isWarehouseManager,
    isDepartmentHead,
    isAccountant,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
