import { useRef, useState } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { supabase } from '../../lib/supabaseClient'
import { useCategories } from '../../hooks/useCategories'
import { downloadCsv, parseCsv, numberOr } from '../../lib/csv'
import ProductForm from '../../components/admin/ProductForm'
import ProductTable from '../../components/admin/ProductTable'
import Loading from '../../components/common/Loading'
import toast from 'react-hot-toast'
import { Download, FileSpreadsheet, Plus, Upload } from 'lucide-react'

const ManageProducts = () => {
  const { products, loading, refetch } = useProducts()
  const { categories } = useCategories()
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const importInput = useRef(null)

  const handleEdit = (product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      toast.success('Product deleted!')
      refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingProduct(null)
    refetch()
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  const exportProducts = () => {
    const columns = ['product_code', 'product_name', 'description', 'category', 'category_id', 'image_url', 'retail_price', 'retail_mrp', 'wholesale_price', 'wholesale_mrp', 'wholesale_min_order_qty', 'retail_stock', 'wholesale_stock']
    const rows = products.map((product) => [
      product.product_code, product.product_name, product.description || '', product.categories?.category_name || '', product.category_id,
      product.image_url || '', product.price ?? '', product.mrp ?? '', product.wholesale_price ?? '',
      product.wholesale_mrp ?? '', product.min_order_qty || 1, product.stock_by_channel?.retail ?? 0, product.stock_by_channel?.wholesale ?? 0,
    ])
    downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows)
  }

  const importProducts = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const rows = parseCsv(await file.text())
      if (!rows.length) throw new Error('The CSV file has no product rows.')
      const categoryByName = new Map(categories.map((category) => [category.category_name.trim().toLowerCase(), category.id]))
      for (const [index, row] of rows.entries()) {
        const line = index + 2
        const categoryId = row.category_id || categoryByName.get((row.category || '').trim().toLowerCase())
        if (!row.product_code || !row.product_name || !categoryId) throw new Error(`Row ${line}: product_code, product_name and a valid category are required.`)
        const retailPrice = numberOr(row.retail_price, NaN), retailMrp = numberOr(row.retail_mrp, NaN)
        const wholesalePrice = numberOr(row.wholesale_price, NaN), wholesaleMrp = numberOr(row.wholesale_mrp, NaN)
        if (![retailPrice, retailMrp, wholesalePrice, wholesaleMrp].every(Number.isFinite)) throw new Error(`Row ${line}: all four prices are required.`)
        if (retailMrp < retailPrice || wholesaleMrp < wholesalePrice) throw new Error(`Row ${line}: MRP cannot be less than selling price.`)
        const productPayload = { product_code: row.product_code, product_name: row.product_name, description: row.description?.trim() || null, category_id: categoryId, image_url: row.image_url || null, price: retailPrice, mrp: retailMrp, stock: numberOr(row.retail_stock) }
        const { data: existing } = await supabase.from('products').select('id').eq('product_code', row.product_code).maybeSingle()
        const productId = existing?.id
        const productResult = productId
          ? await supabase.from('products').update(productPayload).eq('id', productId).select('id').single()
          : await supabase.from('products').insert(productPayload).select('id').single()
        if (productResult.error) throw productResult.error
        const savedId = productResult.data.id
        const priceResult = await supabase.from('product_prices').upsert({ product_id: savedId, wholesale_price: wholesalePrice, wholesale_mrp: wholesaleMrp, wholesale_min_order_qty: Math.max(1, Math.trunc(numberOr(row.wholesale_min_order_qty, 1))) }, { onConflict: 'product_id' })
        if (priceResult.error) throw priceResult.error
        const stockResult = await supabase.from('product_stock').upsert({ product_id: savedId, retail_quantity: Math.max(0, Math.trunc(numberOr(row.retail_stock))), wholesale_quantity: Math.max(0, Math.trunc(numberOr(row.wholesale_stock))), updated_at: new Date().toISOString() }, { onConflict: 'product_id' })
        if (stockResult.error) throw stockResult.error
      }
      toast.success(`${rows.length} product${rows.length === 1 ? '' : 's'} imported.`)
      refetch()
    } catch (error) { toast.error(error.message || 'Import failed.') }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
        {!showForm && (
          <div className="flex flex-wrap gap-2">
            <input ref={importInput} type="file" accept=".csv,text/csv" onChange={importProducts} className="hidden" />
            <button onClick={() => importInput.current?.click()} className="flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-100 transition"><Upload className="h-4 w-4" />Import Excel CSV</button>
            <button onClick={() => downloadCsv('product-import-template.csv', ['product_code', 'product_name', 'description', 'category', 'category_id', 'image_url', 'retail_price', 'retail_mrp', 'wholesale_price', 'wholesale_mrp', 'wholesale_min_order_qty', 'retail_stock', 'wholesale_stock'], [])} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition"><FileSpreadsheet className="h-4 w-4" />Template</button>
            <button onClick={exportProducts} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition"><Download className="h-4 w-4" />Export Products</button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"><Plus className="h-4 w-4" />Add Product</button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ProductForm
            product={editingProduct}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      <ProductTable
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

export default ManageProducts
