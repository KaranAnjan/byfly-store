import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useWishlist } from '../../context/WishlistContext'
import { supabase, getImageUrl } from '../../lib/supabaseClient'
import { Heart, Package, User, LogOut, Loader, MapPin, Edit3, Save, ChevronDown, ChevronUp, Check, Trash2, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { visibleAccountEmail, visibleAccountPhone } from '../../lib/accountIdentity'

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

const DEFAULT_ADDR = { name: '', phone: '', address: '', city: '', state: '', pincode: '', contact_email: '' }

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered']

const getCurrentStep = (status) => {
  if (status === 'cancelled') return -1
  if (status === 'out_for_delivery') return 2
  return STATUS_STEPS.indexOf(status)
}

const Profile = () => {
  const { user, profileSummary, signOut } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [profileOwnerId, setProfileOwnerId] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [address, setAddress] = useState({ ...DEFAULT_ADDR })
  const [contactEmail, setContactEmail] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)

  useEffect(() => {
    if (!user) {
      setOrders([])
      setProfile(null)
      setAddress({ ...DEFAULT_ADDR })
      setLoading(false)
      navigate('/login')
      return
    }

    let cancelled = false
    setLoading(true)
    setOrders([])
    setExpandedOrder(null)
    const metadataAddress = user.user_metadata?.address || {}
    const savedEmail = user.user_metadata?.contact_email || metadataAddress.contact_email || visibleAccountEmail(user)
    setContactEmail(savedEmail)
    setAddress({ ...DEFAULT_ADDR, ...metadataAddress, contact_email: savedEmail })

    const restoreProfile = async () => {
      const currentProfile = {
        ...metadataAddress,
        name: user.user_metadata?.name || '',
      }
      if (!cancelled) {
        setProfile(currentProfile)
        setAddress({ ...DEFAULT_ADDR, ...currentProfile, contact_email: savedEmail })
      }

      const { data: rawOrders, error: ordersError } = await supabase
        .from('orders').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false })
      if (ordersError) throw ordersError

      const orderIds = (rawOrders || []).map((order) => order.id)
      let allItems = []
      if (orderIds.length) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items').select('*, products(*)')
          .in('order_id', orderIds)
        if (itemsError) throw itemsError
        allItems = items || []
      }
      const itemsByOrder = new Map()
      for (const item of allItems) {
        const orderItems = itemsByOrder.get(item.order_id) || []
        orderItems.push(item)
        itemsByOrder.set(item.order_id, orderItems)
      }
      const ordersWithItems = (rawOrders || []).map((order) => ({
        ...order,
        order_items: itemsByOrder.get(order.id) || [],
      }))

      if (!cancelled) {
        setOrders(ordersWithItems)
      }
    }

    restoreProfile().catch((error) => {
      console.error('Unable to restore profile data from Supabase:', error)
    }).finally(() => {
      if (!cancelled) {
        setProfileOwnerId(user.id)
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [user?.id])

  const handleSaveAddress = async () => {
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        name: address.name, phone: address.phone,
        address: address.address, city: address.city,
        state: address.state, pincode: address.pincode,
        contact_email: contactEmail.trim().toLowerCase(),
      }
      const { data: userData, error } = await supabase.auth.updateUser({
        data: { address: payload, contact_email: payload.contact_email }
      })
      if (error) throw error
      setProfile((current) => ({ ...current, ...payload }))
      setEditing(false)
      toast.success('Address saved!')
    } catch (_err) {
      toast.error('Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Logged out')
    navigate('/')
  }

  // Add state for active tab
  const [activeTab, setActiveTab] = useState('orders')
  const { wishlistProducts, removeFromWishlist, loading: wishlistLoading, refetch } = useWishlist()

  if (!user) return null

  if (loading || profileOwnerId !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{profile?.name || profileSummary?.name || user?.user_metadata?.name || visibleAccountPhone(user) || 'My account'}</h1>
              <p className="text-sm text-gray-500">{contactEmail || visibleAccountEmail(user) || visibleAccountPhone(user)}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="text-sm text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Address */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 h-fit">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <h2 className="text-base font-bold text-gray-900">Address</h2>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <input type="email" placeholder="Email address (optional)" value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                <input type="text" placeholder="Full Name" value={address.name}
                  onChange={e => setAddress({...address, name: e.target.value})}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                <input type="tel" placeholder="Phone" value={address.phone}
                  onChange={e => setAddress({...address, phone: e.target.value})}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                <textarea placeholder="Address" rows={2} value={address.address}
                  onChange={e => setAddress({...address, address: e.target.value})}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="City" value={address.city}
                    onChange={e => setAddress({...address, city: e.target.value})}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  <select value={address.state} onChange={e => setAddress({...address, state: e.target.value})}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                    <option value="">State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <input type="text" placeholder="PIN Code" value={address.pincode}
                  onChange={e => setAddress({...address, pincode: e.target.value})}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditing(false)} className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-md py-1.5 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveAddress} disabled={saving}
                    className="flex-1 text-sm bg-emerald-700 text-white rounded-md py-1.5 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1">
                    <Save className="h-3.5 w-3.5" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 space-y-1">
                {(contactEmail || visibleAccountEmail(user)) && <p>{contactEmail || visibleAccountEmail(user)}</p>}
                {profile?.name && <p className="font-medium text-gray-900">{profile.name}</p>}
                {(profile?.phone || visibleAccountPhone(user)) && <p className="text-gray-500">{profile?.phone || visibleAccountPhone(user)}</p>}
                {profile?.address ? (
                  <>
                    <p>{profile.address}</p>
                    <p>{profile.city}{profile.city && profile.state ? ', ' : ''}{profile.state}</p>
                    {profile.pincode && <p>PIN: {profile.pincode}</p>}
                  </>
                ) : profile?.city ? (
                  <>
                    <p>{profile.city}{profile.state ? ', ' + profile.state : ''}</p>
                    {profile.pincode && <p>PIN: {profile.pincode}</p>}
                  </>
                ) : (
                  <div>
                    <p className="text-gray-400 text-xs italic mb-2">No address saved.</p>
                    <button onClick={() => setEditing(true)} className="text-xs text-emerald-600 hover:text-emerald-700">Add Address</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs + Content */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
              <button onClick={() => setActiveTab('orders')}
                className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-all ${
                  activeTab === 'orders' ? 'bg-emerald-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                <Package className="h-4 w-4 inline mr-1.5" />
                Orders
              </button>
              <button onClick={() => setActiveTab('wishlist')}
                className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-all ${
                  activeTab === 'wishlist' ? 'bg-emerald-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                <Heart className="h-4 w-4 inline mr-1.5" />
                Wishlist
              </button>
            </div>

            {activeTab === 'orders' ? (
              <>
                {orders.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-500 mb-4">No orders yet.</p>
                    <button onClick={() => navigate('/products')} className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm px-5 py-2 rounded-lg transition-colors">
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="bg-white rounded-lg border border-gray-200">
                        <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                          <div>
                            <p className="text-xs text-gray-400">{order.order_number || `#${order.id}`}</p>
                            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {order.delivery_status === 'cancelled' ? (
                              <span className="text-xs text-red-600 font-medium">Cancelled</span>
                            ) : (
                              <div className="flex items-end">
                                {STATUS_STEPS.map((step, idx) => {
                                  const currentStep = getCurrentStep(order.delivery_status)
                                  const isCompleted = currentStep >= 0 && idx <= currentStep
                                  const isCurrent = idx === currentStep
                                  const label = step.charAt(0).toUpperCase() + step.slice(1)
                                  return (
                                    <div key={step} className="flex items-end">
                                      <div className="relative w-4">
                                        <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap text-[10px] leading-none ${
                                          isCurrent ? 'font-semibold text-emerald-700' :
                                          isCompleted ? 'text-gray-700' : 'text-gray-400'
                                        }`}>
                                          {label}
                                        </span>
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                          isCompleted ? 'bg-emerald-600' : 'bg-gray-200'
                                        }`}>
                                          {isCompleted && <Check className="h-2.5 w-2.5 text-white" />}
                                        </div>
                                      </div>
                                      {idx < STATUS_STEPS.length - 1 && (
                                        <div className={`w-8 h-0.5 mb-[7px] ${
                                          currentStep >= 0 && idx < currentStep ? 'bg-emerald-600' : 'bg-gray-200'
                                        }`} />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            <span className="text-sm font-bold text-emerald-700">₹{order.total_amount}</span>
                            {expandedOrder === order.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </div>
                        </button>

                        {expandedOrder === order.id && (
                          <div className="border-t border-gray-100 p-4 space-y-2">
                              {order.order_items?.length === 0 ? (
                                <p className="text-xs text-gray-400">No items in this order.</p>
                              ) : (
                                order.order_items?.map((item) => (
                                  <Link key={item.id} to={`/products/${item.product_id}`}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                                    <div className="h-12 w-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                      {item.products?.image_url ? (
                                        <img src={getImageUrl(item.products.image_url)} alt={item.products.name} className="h-full w-full object-cover" />
                                      ) : (
                                        <Package className="h-5 w-5 m-auto text-gray-300 mt-3.5" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-900 truncate">{item.products?.name || 'Product'}</p>
                                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">₹{item.price * item.quantity}</span>
                                  </Link>
                                ))
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {wishlistLoading ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <Loader className="h-6 w-6 text-emerald-600 animate-spin mx-auto" />
                  </div>
                ) : wishlistProducts.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <Heart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-4">Your wishlist is empty.</p>
                    <button onClick={() => navigate('/products')} className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm px-5 py-2 rounded-lg transition-colors">
                      Browse Products
                    </button>
                  </div>
                ) : (
                  wishlistProducts.map((p) => (
                    <div key={p.id} className="bg-white rounded-lg border border-gray-200">
                      <Link to={`/products/${p.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                        <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          {p.image_url ? (
                            <img src={getImageUrl(p.image_url)} alt={p.product_name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 m-auto text-gray-300 mt-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.product_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.product_code}</p>
                          <p className="text-sm font-bold text-emerald-700 mt-0.5">₹{p.price || p.mrp}</p>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromWishlist(p.id) }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
