import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  SwapHoriz as TransferIcon,
  RemoveCircle as WriteOffIcon,
  Assessment as ReportIcon,
  People as UsersIcon,
  Logout as LogoutIcon,
  Business as SupplierIcon,
  Category as ProductIcon,
  DirectionsCar as TransportIcon,
  FactCheck as InventoryCountIcon,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'

const drawerWidth = 240

const allMenuItems = [
  { text: 'Dashboard',    icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'manager', 'warehouse_manager', 'department_head', 'accountant'] },
  { text: 'Залишки',      icon: <InventoryIcon />,       path: '/inventory',        roles: ['admin', 'manager', 'warehouse_manager', 'department_head', 'accountant'] },
  { text: 'Інвентаризація', icon: <InventoryCountIcon />, path: '/inventory-counts', roles: ['admin', 'manager', 'warehouse_manager'] },
  { text: 'Закупівлі',   icon: <PurchaseIcon />,  path: '/purchases', roles: ['admin', 'manager'] },
  { text: 'Переміщення', icon: <TransferIcon />,  path: '/transfers', roles: ['admin', 'manager', 'warehouse_manager'] },
  { text: 'Списання',    icon: <WriteOffIcon />,  path: '/writeoffs', roles: ['admin', 'manager', 'warehouse_manager', 'department_head'] },
  { text: 'Звіти',       icon: <ReportIcon />,    path: '/reports',   roles: ['admin', 'manager', 'warehouse_manager', 'accountant'] },
]

const dictionaryMenuItems = [
  { text: 'Постачальники',      icon: <SupplierIcon />,   path: '/suppliers' },
  { text: 'Товари / Матеріали', icon: <ProductIcon />,    path: '/products' },
  { text: 'Транспорт',          icon: <TransportIcon />,  path: '/transport' },
]

const adminMenuItems = [
  { text: 'Користувачі', icon: <UsersIcon />, path: '/users' },
]

const PING_INTERVAL_MS = 10 * 60 * 1000 // 10 хвилин

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout, isAdmin, isDepartmentHead, isAccountant } = useAuth()
  const navigate = useNavigate()

  // Keep-alive пінг для Render (безкоштовний tier засипає після 15 хв неактивності)
  useEffect(() => {
    const ping = () => fetch('/health').catch(() => {})
    const id = setInterval(ping, PING_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavigation = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Agro ERP
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {allMenuItems
          .filter((item) => item.roles.includes(user?.role?.name))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton onClick={() => handleNavigation(item.path)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
      {!isDepartmentHead() && !isAccountant() && (
        <>
          <Divider />
          <List>
            {dictionaryMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={() => handleNavigation(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
      {isAdmin() && (
        <>
          <Divider />
          <List>
            {adminMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={() => handleNavigation(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={logout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Вихід" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Agro ERP System
          </Typography>
          <Typography variant="body1">
            Користувач: {user?.username || 'admin'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}

export default MainLayout
