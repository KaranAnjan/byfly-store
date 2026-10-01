import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'

const StockUpdate = ({ product, onUpdate }) => {
  const [retailStock, setRetailStock] = useState(Number(product.stock_by_channel?.retail ?? 0))
  const [wholesaleStock, setWholesaleStock] = useState(Number(product.stock_by_channel?.wholesale ?? 0))
  const [saving, setSaving] = useState(false)
  const totalStock = Number(retailStock) === Number(wholesaleStock)
    ? Number(retailStock)
    : Number(retailStock) + Number(wholesaleStock)

  useEffect(() => {
    setRetailStock(Number(product.stock_by_channel?.retail ?? 0))
    setWholesaleStock(Number(product.stock_by_channel?.wholesale ?? 0))
  }, [product])

  const updateStock = async (event) => {
    event.preventDefault()
    if (![retailStock, wholesaleStock].every((value) => Number.isInteger(Number(value)) && Number(value) >= 0)) {
      toast.error('Enter whole-number stock quantities, zero or more.')
      return
    }
    const retail = Number(retailStock)
    const wholesale = Number(wholesaleStock)
    setSaving(true)
    try {
      const { error: stockError } = await supabase.from('product_stock').upsert({
        product_id: product.id,
        retail_quantity: retail,
        wholesale_quantity: wholesale,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'product_id' })
      if (stockError) throw stockError
      toast.success(`Stock saved. Total available: ${totalStock}`)
      onUpdate()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return <>
    <td className="px-6 py-4">
      <input aria-label={`${product.product_name} retail stock`} type="number" min="0" step="1" required
        value={retailStock} onChange={(event) => setRetailStock(event.target.value)}
        className="w-24 rounded border border-slate-300 px-2 py-1.5 font-mono" />
    </td>
    <td className="px-6 py-4">
      <input aria-label={`${product.product_name} wholesale stock`} type="number" min="0" step="1" required
        value={wholesaleStock} onChange={(event) => setWholesaleStock(event.target.value)}
        className="w-24 rounded border border-slate-300 px-2 py-1.5 font-mono" />
    </td>
    <td className="px-6 py-4 font-mono font-bold">{totalStock}</td>
    <td className="px-6 py-4">
      <button type="button" onClick={updateStock} disabled={saving}
        className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {saving ? 'Saving…' : 'Save stock'}
      </button>
    </td>
  </>
}

export default StockUpdate
