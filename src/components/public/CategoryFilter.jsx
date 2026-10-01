const CategoryFilter = ({ categories, selected, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 ${
          selected === null
            ? 'bg-gradient-to-r from-emerald-600 to-emerald-600 text-white shadow-lg scale-105 animate-pulse'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-4 py-2 rounded-full font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            selected === cat.id
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-600 text-white shadow-lg scale-105 animate-pulse'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
          }`}
        >
          {cat.category_name}
        </button>
      ))}
    </div>
  )
}

export default CategoryFilter