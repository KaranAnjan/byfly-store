import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabaseClient'
import { attachProductPrices, normalizeStoreProduct } from '../lib/storeCatalog'
import toast from 'react-hot-toast'

const CartContext = createContext()
const GUEST_CART_KEY = 'monimala_cart_guest'
const userCartKey = (userId) => `monimala_cart_${userId}`

const readCartCache = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeCartCache = (key, cart) => {
  try {
    localStorage.setItem(key, JSON.stringify(cart))
  } catch (error) {
    console.warn('Unable to cache cart in this browser.', error)
  }
}

const persistUserCart = async (userId, action, productId, quantity) => {
  if (action === 'clear') {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', userId)
    if (error) throw error
    return
  }

  let query = supabase.from('cart_items')
  if (action === 'remove') {
    const { error } = await query.delete()
      .eq('user_id', userId)
      .eq('product_id', String(productId))
    if (error) throw error
    return
  }

  const { error } = await query.upsert({
    user_id: userId,
    product_id: String(productId),
    quantity,
  }, { onConflict: 'user_id,product_id' })
  if (error) throw error
}

export const useCart = () => useContext(CartContext)

export const CartProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const [cart, setCart] = useState([])
  const [cartOwnerId, setCartOwnerId] = useState('guest')
  const [loading, setLoading] = useState(true)
  const currentOwnerId = user?.id || 'guest'
  const visibleCart = cartOwnerId === currentOwnerId ? cart : []
  const visibleLoading = authLoading || loading || cartOwnerId !== currentOwnerId

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    const ownerId = user?.id || 'guest'
    setLoading(true)
    setCart([])
    setCartOwnerId(ownerId)

    const restoreCart = async () => {
      if (!user) {
        setCart(readCartCache(GUEST_CART_KEY))
        setLoading(false)
        return
      }

      setLoading(true)
      const cacheKey = userCartKey(user.id)

      try {
        const { data: savedRows, error } = await supabase
          .from('cart_items')
          .select('product_id, quantity')
          .eq('user_id', user.id)
        if (error) throw error

        const productIds = (savedRows || []).map((row) => row.product_id)
        let savedCart = []
        if (productIds.length) {
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, product_name, product_code, image_url, stock, price, mrp, product_stock(retail_quantity,wholesale_quantity)')
            .in('id', productIds)
          if (productsError) throw productsError
          const productsWithPrices = await attachProductPrices(products || [])
          const quantities = new Map(savedRows.map((row) => [String(row.product_id), row.quantity]))
          savedCart = productsWithPrices.map((product) => ({
            ...normalizeStoreProduct(product),
            quantity: quantities.get(String(product.id)) || 1,
          }))
        }

        if (!cancelled) {
          setCart(savedCart)
          writeCartCache(cacheKey, savedCart)
        }
      } catch (error) {
        console.error('Unable to restore cart from Supabase:', error)
        if (!cancelled) setCart(readCartCache(cacheKey))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restoreCart()
    return () => { cancelled = true }
  }, [user?.id, authLoading])

  const saveCart = (nextCart, action, productId, quantity) => {
    setCart(nextCart)
    setCartOwnerId(currentOwnerId)
    if (!user) {
      writeCartCache(GUEST_CART_KEY, nextCart)
      return
    }

    writeCartCache(userCartKey(user.id), nextCart)
    persistUserCart(user.id, action, productId, quantity).catch((error) => {
      console.error('Unable to save cart to Supabase:', error)
    })
  }

  const addToCart = (product) => {
    const existing = visibleCart.find((item) => item.id === product.id)
    const increment = Math.max(1, Number(product.min_order_qty || 1))
    const nextQuantity = (existing?.quantity || 0) + increment
    if (Number(product.stock || 0) < increment || (product.stock && nextQuantity > product.stock)) {
      toast.error('There is not enough stock for that order quantity.')
      return
    }
    const nextCart = existing
      ? visibleCart.map((item) => item.id === product.id
        ? { ...item, quantity: nextQuantity }
        : item)
      : [...visibleCart, { ...product, quantity: increment }]
    saveCart(nextCart, 'upsert', product.id, nextQuantity)
  }

  const removeFromCart = (productId) => {
    saveCart(visibleCart.filter((item) => item.id !== productId), 'remove', productId)
  }

  const updateQuantity = (productId, quantity) => {
    const item = visibleCart.find((cartItem) => cartItem.id === productId)
    const minimum = Math.max(1, Number(item?.min_order_qty || 1))
    if (quantity <= 0) {
      removeFromCart(productId)
    } else if (quantity < minimum) {
      toast.error(`Minimum order quantity is ${minimum}.`)
    } else if (item?.stock && quantity > item.stock) {
      toast.error(`Only ${item.stock} units are available.`)
    } else {
      saveCart(visibleCart.map((item) => item.id === productId ? { ...item, quantity } : item), 'upsert', productId, quantity)
    }
  }

  const clearCart = () => saveCart([], 'clear')
  const total = visibleCart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ cart: visibleCart, loading: visibleLoading, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  )
}


