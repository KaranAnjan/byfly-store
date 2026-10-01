import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to get public URL for images
export const BUCKET_NAME = 'Monimala'

export const getImageUrl = (path) => {
  // If it's already a full URL, return it as-is
  if (path && path.startsWith('http')) {
    return path
  }
  
  // Otherwise, convert the file path to public URL
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}