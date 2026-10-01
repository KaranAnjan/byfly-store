import { useEffect, useState } from 'react'
import { supabase, getImageUrl } from '../../lib/supabaseClient'
import { Package, ChevronDown, ChevronUp, Search, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUSES = ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

const ManageDelivery = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch] = useState('')
  const [draftStatus, setDraftStatus] = useState({})

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders').select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      const withItems = await Promise.all((data || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items').select('*')
          .eq('order_id', order.id)
        const productIds = [...new Set((items || []).map(i => i.product_id).filter(Boolean))]
        const { data: products } = productIds.length
          ? await supabase.from('products').select('*').in('id', productIds)
          : { data: [] }
        const productMap = Object.fromEntries((products || []).map(p => [p.id, p]))

        if (!order.customer_name) {
          const { data: profile } = await supabase
            .from('users').select('name, phone, address, city, state, pincode')
            .eq('id', order.user_id).maybeSingle()
          if (profile) {
            const addr = profile.address ? `${profile.address}, ${profile.city}, ${profile.state} - ${profile.pincode}` : ''
            order.customer_name = profile.name
            order.customer_address = addr
            order.customer_pincode = profile.pincode
          }
        }

        return {
          ...order,
          order_items: (items || []).map(i => ({ ...i, products: productMap[i.product_id] }))
        }
      }))

      setOrders(withItems)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (orderId, newStatus) => {
    try {
      const payload = { delivery_status: newStatus }
      if (newStatus === 'delivered') payload.delivery_date = new Date().toISOString()
      if (newStatus === 'cancelled') payload.status = 'cancelled'
      if (newStatus === 'delivered') payload.status = 'completed'

      const { error } = await supabase.from('orders').update(payload).eq('id', orderId)
      if (error) throw error

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o))
      setDraftStatus(prev => { const copy = { ...prev }; delete copy[orderId]; return copy })
      toast.success(`Order updated to ${newStatus.replace(/_/g, ' ')}`)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const filtered = orders.filter(o =>
    !search || (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_phone || '').includes(search)
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search order, name, phone..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((order) => {
              const currentStatus = order.delivery_status || 'pending'
              const selectedStatus = draftStatus[order.id] ?? currentStatus
              const isChanged = selectedStatus !== currentStatus

              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                      className="flex items-center gap-1 text-sm font-mono text-emerald-600 hover:text-emerald-800">
                      {order.order_number || `#${order.id}`}
                      {expanded === order.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm font-medium text-gray-900">{order.customer_name || 'N/A'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      {order.customer_address || ''}
                    </p>
                    {order.customer_pincode && <p className="text-xs text-gray-400">PIN: {order.customer_pincode}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">
                      {expanded === order.id ? (
                        <div className="space-y-1">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                              {item.products?.image_url ? (
                                <img src={getImageUrl(item.products.image_url)} alt="" className="h-6 w-6 rounded object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-gray-300" />
                              )}
                              <span>{item.products?.name || 'Product'} x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        `${order.order_items?.length || 0} items`
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{order.total_amount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      currentStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                      currentStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                      currentStatus === 'shipped' || currentStatus === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {currentStatus.replace(/_/g, ' ')}
                    </span>
                    {order.delivery_date && (
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(order.delivery_date).toLocaleDateString()}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select value={selectedStatus}
                        onChange={e => setDraftStatus(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                      {isChanged && (
                        <button onClick={() => updateStatus(order.id, selectedStatus)}
                          className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md transition-colors">
                          <Check className="h-3 w-3" /> Update
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageDelivery