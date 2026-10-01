import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import { attachProductPrices, normalizeStoreProduct } from '../lib/storeCatalog'

const WishlistContext = createContext()
const wishlistCacheKey = (userId) => `monimala_wishlist_${userId}`

const readWishlistCache = (userId) => {
  try {
    const cached = JSON.parse(localStorage.getItem(wishlistCacheKey(userId)) || '{}')
    return {
      ids: Array.isArray(cached.ids) ? cached.ids : [],
      products: Array.isArray(cached.products) ? cached.products : [],
    }
  } catch {
    return { ids: [], products: [] }
  }
}

const writeWishlistCache = (userId, ids, products) => {
  try {
    localStorage.setItem(wishlistCacheKey(userId), JSON.stringify({ ids, products }))
  } catch (error) {
    console.warn('Unable to cache wishlist in this browser.', error)
  }
}

export const useWishlist = () => useContext(WishlistContext)

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth()
  const [wishlistIds, setWishlistIds] = useState(new Set())
  const [wishlistProducts, setWishlistProducts] = useState([])
  const [wishlistOwnerId, setWishlistOwnerId] = useState(null)
  const [loading, setLoading] = useState(false)
  const currentUserId = user?.id || null
  const visibleWishlistIds = wishlistOwnerId === currentUserId ? wishlistIds : new Set()
  const visibleWishlistProducts = wishlistOwnerId === currentUserId ? wishlistProducts : []
  const visibleLoading = loading || (Boolean(currentUserId) && wishlistOwnerId !== currentUserId)

  useEffect(() => {
    let cancelled = false
    const userId = user?.id || null
    setWishlistIds(new Set())
    setWishlistProducts([])
    setWishlistOwnerId(userId)

    if (!userId) {
      setLoading(false)
      return () => { cancelled = true }
    }

    setLoading(true)
    const loadWishlist = async () => {
      const { data, error } = await supabase
        .from('wishlists')
        .select('*, products(*, product_stock(retail_quantity,wholesale_quantity))')
        .eq('user_id', userId)

      if (cancelled) return
      if (error) {
        console.error('Unable to restore wishlist from Supabase:', error)
        const cached = readWishlistCache(userId)
        setWishlistIds(new Set(cached.ids))
        setWishlistProducts(cached.products)
      } else {
        const ids = (data || []).map(item => item.product_id)
        const productRows = (data || []).map((item) => item.products).filter(Boolean)
        const productsWithPrices = await attachProductPrices(productRows)
        const pricesById = new Map(productsWithPrices.map((product) => [String(product.id), product]))
        const products = (data || []).map((item) => pricesById.get(String(item.product_id)))
          .filter(Boolean).map(normalizeStoreProduct)
        setWishlistIds(new Set(ids))
        setWishlistProducts(products)
        writeWishlistCache(userId, ids, products)
      }
      setLoading(false)
    }

    loadWishlist().catch((error) => {
      console.error('Unable to restore wishlist from Supabase:', error)
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [user?.id])

  const fetchWishlist = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('wishlists')
      .select('*, products(*, product_stock(retail_quantity,wholesale_quantity))')
      .eq('user_id', user.id)
    if (error) throw error
    const ids = (data || []).map(item => item.product_id)
    const productRows = (data || []).map((item) => item.products).filter(Boolean)
    const productsWithPrices = await attachProductPrices(productRows)
    const pricesById = new Map(productsWithPrices.map((product) => [String(product.id), product]))
    const products = (data || []).map((item) => pricesById.get(String(item.product_id)))
      .filter(Boolean).map(normalizeStoreProduct)
    setWishlistIds(new Set(ids))
    setWishlistProducts(products)
    writeWishlistCache(user.id, ids, products)
    setWishlistOwnerId(user.id)
    setLoading(false)
  }

  const addToWishlist = async (productOrId) => {
    if (!user) { toast.error('Please login to add to wishlist'); return }
    const product = typeof productOrId === 'object' ? productOrId : null
    const productId = product?.id ?? productOrId
    const { error } = await supabase
      .from('wishlists')
      .insert({ user_id: user.id, product_id: productId })
    if (!error) {
      const ids = new Set([...visibleWishlistIds, productId])
      const products = [...visibleWishlistProducts]
      if (product && !products.some((item) => item.id === product.id)) products.push(product)
      setWishlistOwnerId(user.id)
      setWishlistIds(ids)
      setWishlistProducts(products)
      writeWishlistCache(user.id, [...ids], products)
      toast.success('Added to wishlist!')
    }
  }

  const removeFromWishlist = async (productId) => {
    if (!user) return
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId)
    if (!error) {
      const ids = new Set(visibleWishlistIds)
      ids.delete(productId)
      const products = visibleWishlistProducts.filter(p => p.id !== productId)
      setWishlistOwnerId(user.id)
      setWishlistIds(ids)
      setWishlistProducts(products)
      writeWishlistCache(user.id, [...ids], products)
    }
  }

  const toggleWishlist = async (productId) => {
    const id = typeof productId === 'object' ? productId.id : productId
    if (visibleWishlistIds.has(id)) {
      await removeFromWishlist(id)
    } else {
      await addToWishlist(productId)
    }
  }

  const isInWishlist = (productId) => visibleWishlistIds.has(productId)

  return (
    <WishlistContext.Provider value={{
      wishlistIds: visibleWishlistIds, wishlistProducts: visibleWishlistProducts, loading: visibleLoading,
      addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist, refetch: fetchWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  )
}


