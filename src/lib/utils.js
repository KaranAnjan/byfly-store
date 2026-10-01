export const toSlug = (str) => str?.toLowerCase().replace(/\s+/g, '-') || ''

export const formatName = (str) =>
  str?.replace(/\b\w/g, (c) => c.toUpperCase()) || ''

export const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
