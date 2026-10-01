import { useState, useEffect } from 'react'
import { supabase, BUCKET_NAME, getImageUrl } from '../../lib/supabaseClient'
import { Upload, X, Loader2 } from 'lucide-react'

const ImageUploader = ({ onUpload, currentImage }) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [category, setCategory] = useState('Gifts') // ✅ Folder selector

  // Convert file path to public URL for preview
  useEffect(() => {
    if (currentImage) {
      setPreview(getImageUrl(currentImage))
    } else {
      setPreview(null)
    }
  }, [currentImage])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      // ✅ Upload to correct bucket and folder (Gifts or Jwellery)
      const filePath = `${category}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)  // ✅ "Monimala" not "product-images"
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from(BUCKET_NAME)  // ✅ "Monimala"
        .getPublicUrl(filePath)

      setPreview(data.publicUrl)
      // Store only the file path (e.g., "Gifts/filename.jpg") in database
      // NOT the full public URL
      onUpload(filePath)
    } catch (error) {
      alert('Error uploading image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setPreview(null)
    onUpload('')
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Product Image
      </label>

      {/* ✅ Folder Selector */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">
          Upload to folder:
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        >
          <option value="Gifts">Gifts</option>
          <option value="Jwellery">Jwellery</option>
          <option value="Cosmetics">Cosmetics</option>
        </select>
      </div>

      {preview ? (
        <div className="relative w-40 h-40">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Upload</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  )
}

export default ImageUploader