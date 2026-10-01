import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'

// Layouts
import Navbar from './components/common/Navbar'
import Footer from './components/common/Footer'
import AdminSidebar from './components/admin/AdminSidebar'
import ProtectedRoute from './components/common/ProtectedRoute'
import WholesaleRoute from './components/common/WholesaleRoute'

// Public Pages
import Home from './pages/public/Home'
import Products from './pages/public/Products'
import ProductDetail from './pages/public/ProductDetail'
import Cart from './pages/public/Cart'
import Login from './pages/public/Login'
import Profile from './pages/public/Profile'
import Wishlist from './pages/public/Wishlist'

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin'
import Dashboard from './pages/admin/Dashboard'
import ManageProducts from './pages/admin/ManageProducts'
import ManageCategories from './pages/admin/ManageCategories'
import ManageStock from './pages/admin/ManageStock'
import ManageDelivery from './pages/admin/ManageDelivery'
import ManageWholesaleAccounts from './pages/admin/ManageWholesaleAccounts'

// Admin Layout
const AdminLayout = ({ children }) => (
  <ProtectedRoute>
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  </ProtectedRoute>
)

function AnimatedRoutes() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  if (isAdmin) {
    return (
      <Routes location={location}>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/admin/products" element={<AdminLayout><ManageProducts /></AdminLayout>} />
        <Route path="/admin/categories" element={<AdminLayout><ManageCategories /></AdminLayout>} />
        <Route path="/admin/stock" element={<AdminLayout><ManageStock /></AdminLayout>} />
            <Route path="/admin/delivery" element={<AdminLayout><ManageDelivery /></AdminLayout>} />
            <Route path="/admin/wholesale-accounts" element={<AdminLayout><ManageWholesaleAccounts /></AdminLayout>} />
      </Routes>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={location.pathname + location.search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Routes location={location}>
              <Route path="/" element={<WholesaleRoute><Home /></WholesaleRoute>} />
              <Route path="/products" element={<WholesaleRoute><Products /></WholesaleRoute>} />
              <Route path="/products/:id" element={<WholesaleRoute><ProductDetail /></WholesaleRoute>} />
              <Route path="/category/:slug" element={<WholesaleRoute><Products /></WholesaleRoute>} />
              <Route path="/cart" element={<WholesaleRoute><Cart /></WholesaleRoute>} />
              <Route path="/wishlist" element={<WholesaleRoute><Wishlist /></WholesaleRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/profile" element={<WholesaleRoute><Profile /></WholesaleRoute>} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <AnimatedRoutes />
        </BrowserRouter>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
