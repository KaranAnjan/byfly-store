import { useCategories } from '../../hooks/useCategories'
import { supabase } from '../../lib/supabaseClient'
import CategoryForm from '../../components/admin/CategoryForm'
import Loading from '../../components/common/Loading'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'

const ManageCategories = () => {
  const { categories, loading, refetch } = useCategories()

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? Products in this category will need reassignment.')) return

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      toast.success('Category deleted!')
      refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Manage Categories
      </h1>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="font-semibold mb-4">Add New Category</h3>
        <CategoryForm onSave={refetch} />
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-500">{cat.id}</td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {cat.category_name}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageCategories