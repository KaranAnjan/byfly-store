import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { Trash2, Minus, Plus, MapPin, ShoppingCart, ArrowLeft } from 'lucide-react'
import { supabase, getImageUrl } from '../../lib/supabaseClient'
import { uuid } from '../../lib/utils'
import toast from 'react-hot-toast'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

const Cart = () => {
  const navigate = useNavigate()
  const { cart, loading: cartLoading, removeFromCart, updateQuantity, total, clearCart } = useCart()
  const { user } = useAuth()
  const phone = import.meta.env.VITE_PHONE || '+917407437378'

  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [address, setAddress] = useState({
    name: '', phone: '', address: '', city: '', state: '', pincode: '', contact_email: ''
  })
  const [savedAddress, setSavedAddress] = useState(null)

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {}
      const addrData = meta.address || {}
      const addr = {
        name: addrData.name || '', phone: addrData.phone || '',
        address: addrData.address || '', city: addrData.city || '',
        state: addrData.state || '', pincode: addrData.pincode || '',
        contact_email: meta.contact_email || addrData.contact_email || '',
      }
      setAddress(addr)
      setSavedAddress(addrData.address || addrData.city ? addr : null)
    }
  }, [user])

  const hasSavedAddress = savedAddress && (savedAddress.address || savedAddress.city)

  const handleWhatsAppOrder = () => {
    if (cart.length === 0) return toast.error('Cart is empty!')
    let msg = 'Hi, I want to order:\n\n'
    cart.forEach(i => { msg += `${i.product_name} x${i.quantity} - Rs.${i.price * i.quantity}\n` })
    msg += `\nTotal: Rs.${total}`
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return toast.error('Cart is empty!')
    if (!user) {
      toast.error('Please login to checkout')
      navigate('/login?redirect=/cart')
      return
    }
    setShowAddressForm(true)
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (!user) return
    setIsPlacingOrder(true)
    try {
      const payload = {
        name: address.name, phone: address.phone,
        address: address.address, city: address.city,
        state: address.state, pincode: address.pincode,
        contact_email: address.contact_email.trim().toLowerCase(),
      }
      const { error: userError } = await supabase.auth.updateUser({
        data: { address: payload, contact_email: payload.contact_email }
      })
      if (userError) throw userError

      const fullAddress = `${address.address}, ${address.city}, ${address.state} - ${address.pincode}`
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        user_id: user.id, total_amount: total,
        status: 'pending', delivery_status: 'pending',
        customer_name: address.name, customer_address: fullAddress,
        customer_pincode: address.pincode,
        created_at: new Date().toISOString()
      }).select('id')
      if (orderError) throw orderError

      const orderId = orderData[0].id
      const { error: itemsError } = await supabase.from('order_items').insert(
        cart.map(item => ({
          order_id: orderId,
          product_id: item.id, quantity: item.quantity, price: item.price
        }))
      )
      if (itemsError) throw itemsError

      setSavedAddress({ name: address.name, phone: address.phone, address: address.address, city: address.city, state: address.state, pincode: address.pincode, contact_email: payload.contact_email })
      toast.success('Order placed successfully! (Cash on Delivery)')
      clearCart()
      navigate('/profile')
    } catch (error) {
      console.error('Order placement error:', error)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (cartLoading) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <p className="text-center text-gray-500 py-16" role="status">Loading your cart...</p>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 text-center py-16">
          <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mb-6">Add some products to get started.</p>
          <Link to="/products" className="inline-block bg-emerald-700 text-white font-medium px-5 py-2 rounded-lg text-sm hover:bg-emerald-800 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/products" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.map((item) => (
              <Link
                key={item.id}
                to={`/products/${item.id}`}
                className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 hover:border-emerald-200 transition-colors"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {item.image_url ? (
                    <img src={getImageUrl(item.image_url)} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.product_name}</h3>
                  <p className="text-xs text-gray-400 mb-2">Code: {item.product_code}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-emerald-700">₹{item.price}</span>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1" onClick={(e) => e.preventDefault()}>
                      <button disabled={item.quantity <= (item.min_order_qty || 1)} onClick={(e) => { e.preventDefault(); updateQuantity(item.id, item.quantity - 1) }} className="p-0.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                      <button disabled={item.quantity >= item.stock} onClick={(e) => { e.preventDefault(); updateQuantity(item.id, item.quantity + 1) }} className="p-0.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">Subtotal: ₹{item.price * item.quantity}</span>
                    <button onClick={(e) => { e.preventDefault(); removeFromCart(item.id) }} className="text-red-500 hover:text-red-700 transition-colors p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-lg border border-gray-200 p-5 lg:sticky lg:top-24">
              <h2 className="text-base font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-gray-600">
                    <span className="truncate mr-2">{item.product_name} x{item.quantity}</span>
                    <span className="font-medium flex-shrink-0">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-emerald-700">₹{total}</span>
              </div>

              {!showAddressForm ? (
                <div className="space-y-2">
                  <button onClick={handleWhatsAppOrder} className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                    Order via WhatsApp
                  </button>
                  <button onClick={handleProceedToCheckout} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                    Proceed to Checkout
                  </button>
                  <button onClick={() => navigate('/products')} className="w-full text-gray-500 hover:text-gray-700 text-xs py-2 transition-colors">
                    Continue Shopping
                  </button>
                  <button onClick={() => { clearCart(); toast.success('Cart cleared!') }} className="w-full text-red-500 hover:text-red-700 text-xs py-1 transition-colors">
                    Clear Cart
                  </button>
                </div>
              ) : hasSavedAddress && !editingAddress ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-sm font-semibold">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </div>
                    <button onClick={() => setEditingAddress(true)} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                      Edit
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5 mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
                    <p className="font-medium text-gray-900">{savedAddress.name}</p>
                    {savedAddress.contact_email && <p>{savedAddress.contact_email}</p>}
                    <p>{savedAddress.phone}</p>
                    <p>{savedAddress.address}</p>
                    <p>{savedAddress.city}{savedAddress.state ? ', ' + savedAddress.state : ''}</p>
                    {savedAddress.pincode && <p>PIN: {savedAddress.pincode}</p>}
                  </div>

                  <div className="bg-gray-50 text-gray-600 p-2.5 rounded-md text-xs border border-gray-200 mb-3">
                    Payment: Cash on Delivery (COD)
                  </div>

                  <button onClick={handlePlaceOrder} disabled={isPlacingOrder}
                    className={`w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors ${isPlacingOrder ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {isPlacingOrder ? 'Placing Order...' : 'Place Order (COD)'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePlaceOrder} className="space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 text-sm font-semibold mb-2">
                    <MapPin className="h-4 w-4" />
                    {editingAddress ? 'Edit Address' : 'Delivery Details'}
                  </div>
                  <input type="email" placeholder="Email address (optional)" value={address.contact_email}
                    onChange={e => setAddress({...address, contact_email: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  <input type="text" required placeholder="Full Name" value={address.name} onChange={e => setAddress({...address, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  <input type="tel" required placeholder="Phone Number" value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  <textarea required placeholder="Full Address" rows={2} value={address.address} onChange={e => setAddress({...address, address: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" required placeholder="City" value={address.city} onChange={e => setAddress({...address, city: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                    <select required value={address.state} onChange={e => setAddress({...address, state: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                      <option value="" disabled>State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <input type="text" required placeholder="PIN Code" value={address.pincode} onChange={e => setAddress({...address, pincode: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />

                  <div className="bg-gray-50 text-gray-600 p-2.5 rounded-md text-xs border border-gray-200">
                    Payment: Cash on Delivery (COD)
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddress(false) }}
                      className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition-colors">
                      Back
                    </button>
                    <button type="submit" disabled={isPlacingOrder}
                      className={`flex-[2] bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors ${isPlacingOrder ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      {isPlacingOrder ? 'Placing Order...' : 'Place Order (COD)'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
