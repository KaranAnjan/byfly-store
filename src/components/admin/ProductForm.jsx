import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useCategories } from '../../hooks/useCategories'
import ImageUploader from './ImageUploader'
import toast from 'react-hot-toast'
import { Save, X } from 'lucide-react'

const fieldClass = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

const ProductForm = ({ product, onSave, onCancel }) => {
  const { categories } = useCategories()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ product_name: '', category_id: '', product_code: '', description: '', image_url: '', retail_stock: 0, wholesale_stock: 0, wholesale_price: '', min_order_qty: 1, retail_price: '', retail_mrp: '', wholesale_mrp: '' })

  useEffect(() => {
    if (!product) return
    setForm({ product_name: product.product_name || '', category_id: product.category_id || '', product_code: product.product_code || '', description: product.description || '', image_url: product.image_url || '', retail_stock: product.stock_by_channel?.retail ?? product.stock ?? 0, wholesale_stock: product.stock_by_channel?.wholesale ?? 0, wholesale_price: product.wholesale_price ?? '', min_order_qty: product.min_order_qty || 1, retail_price: product.price ?? product.retail_price ?? '', retail_mrp: product.mrp ?? product.retail_mrp ?? '', wholesale_mrp: product.wholesale_mrp ?? '' })
  }, [product])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const retailPrice = Number(form.retail_price), retailMrp = Number(form.retail_mrp), wholesalePrice = Number(form.wholesale_price), wholesaleMrp = Number(form.wholesale_mrp)
      const minOrderQty = Number(form.min_order_qty), retailStock = Number(form.retail_stock), wholesaleStock = Number(form.wholesale_stock)
      if (![retailPrice, retailMrp, wholesalePrice, wholesaleMrp].every(Number.isFinite)) throw new Error('Enter all retail and wholesale prices and MRP values.')
      if (retailMrp < retailPrice || wholesaleMrp < wholesalePrice) throw new Error('MRP must be greater than or equal to the selling price for each section.')
      if (!Number.isInteger(minOrderQty) || minOrderQty < 1 || ![retailStock, wholesaleStock].every((value) => Number.isInteger(value) && value >= 0)) throw new Error('Stock and minimum order quantity must be valid whole numbers.')
      const productPayload = { product_name: form.product_name, category_id: form.category_id, product_code: form.product_code, description: form.description.trim() || null, image_url: form.image_url, price: retailPrice, mrp: retailMrp, stock: retailStock }
      let productId = product?.id
      if (product) {
        const { error } = await supabase.from('products').update(productPayload).eq('id', product.id)
        if (error) throw error
      } else {
        const { data: created, error } = await supabase.from('products').insert([productPayload]).select('id').single()
        if (error) throw error
        productId = created.id
      }
      const { error: priceError } = await supabase.from('product_prices').upsert({ product_id: productId, wholesale_price: wholesalePrice, wholesale_mrp: wholesaleMrp, wholesale_min_order_qty: minOrderQty }, { onConflict: 'product_id' })
      if (priceError) throw priceError
      const { error: stockError } = await supabase.from('product_stock').upsert({ product_id: productId, retail_quantity: retailStock, wholesale_quantity: wholesaleStock, updated_at: new Date().toISOString() }, { onConflict: 'product_id' })
      if (stockError) throw stockError
      toast.success(product ? 'Product updated!' : 'Product added!')
      onSave()
    } catch (error) { toast.error(error.message) } finally { setLoading(false) }
  }

  return <div className="bg-white rounded-xl shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4">{product ? 'Edit Product' : 'Add New Product'}</h3>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
        <label className="text-sm font-medium text-gray-700">Product name *<input required value={form.product_name} onChange={(e) => set('product_name', e.target.value)} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-700">Product code *<input required value={form.product_code} onChange={(e) => set('product_code', e.target.value)} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-700">Category *<select required value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={fieldClass}><option value="">Select Category</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.category_name}</option>)}</select></label>
        <label className="text-sm font-medium text-gray-700">Description (optional)<textarea rows="4" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Add product details shown on the product page" className={`${fieldClass} resize-y`} /></label>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:min-h-[220px] flex items-center justify-center">
          <ImageUploader currentImage={form.image_url} onUpload={(url) => set('image_url', url)} />
        </div>
        <section className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"><h4 className="font-semibold text-emerald-900">Retail section</h4><p className="mb-3 text-xs text-emerald-700">Shown to retail customers.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><label className="text-sm font-medium text-gray-700">Retail selling price (₹) *<input type="number" required min="0" step="0.01" value={form.retail_price} onChange={(e) => set('retail_price', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Retail MRP (₹) *<input type="number" required min="0" step="0.01" value={form.retail_mrp} onChange={(e) => set('retail_mrp', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Retail stock *<input type="number" required min="0" step="1" value={form.retail_stock} onChange={(e) => set('retail_stock', e.target.value)} className={fieldClass} /></label></div></section>
        <section className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4"><h4 className="font-semibold text-blue-900">Wholesale section</h4><p className="mb-3 text-xs text-blue-700">Shown only to approved wholesale customers.</p><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><label className="text-sm font-medium text-gray-700">Wholesale selling price (₹) *<input type="number" required min="0" step="0.01" value={form.wholesale_price} onChange={(e) => set('wholesale_price', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Wholesale MRP (₹) *<input type="number" required min="0" step="0.01" value={form.wholesale_mrp} onChange={(e) => set('wholesale_mrp', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Minimum order quantity *<input type="number" required min="1" step="1" value={form.min_order_qty} onChange={(e) => set('min_order_qty', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Wholesale stock *<input type="number" required min="0" step="1" value={form.wholesale_stock} onChange={(e) => set('wholesale_stock', e.target.value)} className={fieldClass} /></label></div></section>
      </div>
      <div className="flex space-x-3 pt-4"><button type="submit" disabled={loading} className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"><Save className="h-4 w-4" /><span>{loading ? 'Saving...' : 'Save Product'}</span></button><button type="button" onClick={onCancel} className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"><X className="h-4 w-4" /><span>Cancel</span></button></div>
    </form>
  </div>
}

export default ProductForm
