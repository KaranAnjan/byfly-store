import { Loader2 } from 'lucide-react'

const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
    </div>
  )
}

export default Loading