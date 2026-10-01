import { SearchX } from 'lucide-react'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

const ProductGrid = ({ products }) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
          <SearchX className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-base font-semibold text-gray-700 mb-1">No products found</p>
        <p className="text-sm text-gray-500">Try adjusting your search or filter.</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={item}>
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  )
}

export default ProductGrid