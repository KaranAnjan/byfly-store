import { useProducts } from '../../hooks/useProducts'
import StockUpdate from '../../components/admin/StockUpdate'
import Loading from '../../components/common/Loading'
import { Package } from 'lucide-react'
import { Download } from 'lucide-react'
import { getImageUrl } from '../../lib/supabaseClient'
import { downloadCsv } from '../../lib/csv'

const ManageStock = () => {
  const { products, loading, refetch } = useProducts()

  if (loading) return <Loading />

  const exportStock = () => {
    const columns = ['product_code', 'product_name', 'retail_stock', 'wholesale_stock', 'total_stock', 'retail_price', 'wholesale_price']
    const rows = products.map((product) => [product.product_code, product.product_name, product.stock_by_channel?.retail ?? 0, product.stock_by_channel?.wholesale ?? 0, product.stock_by_channel?.total ?? 0, product.price ?? '', product.wholesale_price ?? ''])
    downloadCsv(`stock-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows)
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Stock Management</h1><p className="text-sm text-gray-500 mt-1">Track retail and wholesale inventory separately.</p></div>
        <button onClick={exportStock} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition"><Download className="h-4 w-4" />Export Stock CSV</button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    {product.image_url ? (
                      <img
                        src={getImageUrl(product.image_url)}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                    <span className="font-medium">{product.product_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-gray-500">
                  {product.product_code}
                </td>
                <StockUpdate product={product} onUpdate={refetch} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageStock
