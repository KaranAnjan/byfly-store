import { Pencil, Trash2, Package } from 'lucide-react'
import { getImageUrl } from '../../lib/supabaseClient'

const ProductTable = ({ products, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Image
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail MRP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale MRP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min. Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail / Wholesale / Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {product.image_url ? (
                    <img
                      src={getImageUrl(product.image_url)}
                      alt={product.product_name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {product.product_name}
                </td>
                <td className="px-6 py-4 text-gray-500 font-mono text-sm">
                  {product.product_code}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {product.categories?.category_name}
                </td>
                <td className="px-6 py-4 font-semibold">{product.price != null ? `Rs. ${product.price}` : 'Not set'}</td>
                <td className="px-6 py-4">{product.mrp != null ? `Rs. ${product.mrp}` : 'Not set'}</td>
                <td className="px-6 py-4 font-semibold">{product.wholesale_price != null ? `Rs. ${product.wholesale_price}` : 'Not set'}</td>
                <td className="px-6 py-4">{product.wholesale_mrp != null ? `Rs. ${product.wholesale_mrp}` : 'Not set'}</td>
                <td className="px-6 py-4">{product.min_order_qty || 1} units</td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-700">
                    {product.stock_by_channel?.retail ?? 0} / {product.stock_by_channel?.wholesale ?? 0} / <strong>{product.stock_by_channel?.total ?? product.stock ?? 0}</strong>
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProductTable
