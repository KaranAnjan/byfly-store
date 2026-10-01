import { supabase } from './supabaseClient'

export const attachProductPrices = async (products) => {
  if (!products?.length) return []
  const ids = products.map((product) => product.id).filter(Boolean)
  const { data, error } = await supabase
    .from('product_prices')
    .select('product_id,wholesale_price,wholesale_mrp,wholesale_min_order_qty')
    .in('product_id', ids)
  if (error) throw error
  const pricesByProduct = new Map((data || []).map((row) => [String(row.product_id), row]))
  return products.map((product) => ({
    ...product,
    product_prices: pricesByProduct.get(String(product.id)) || null,
  }))
}

export const normalizeStoreProduct = (product) => {
  const prices = product.product_prices || {}
  const stockRecord = Array.isArray(product.product_stock) ? product.product_stock[0] : product.product_stock
  const retailStock = Number(stockRecord?.retail_quantity ?? 0)
  const wholesaleStock = Number(stockRecord?.wholesale_quantity ?? 0)
  const totalStock = retailStock + wholesaleStock

  return {
    ...product,
    retail_price: product.price ?? prices.retail_price ?? null,
    wholesale_price: prices.wholesale_price ?? null,
    retail_mrp: product.mrp ?? prices.retail_mrp ?? null,
    wholesale_mrp: prices.wholesale_mrp ?? null,
    min_order_qty: Math.max(1, Number(prices.wholesale_min_order_qty ?? 1)),
    price: prices.wholesale_price ?? null,
    mrp: prices.wholesale_mrp ?? null,
    stock_by_channel: {
      retail: retailStock,
      wholesale: wholesaleStock,
      total: totalStock,
    },
    stock: wholesaleStock,
  }
}
