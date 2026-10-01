export const isInternalAuthEmail = (email = '') =>
  String(email).toLowerCase().endsWith('@phone.byfly.invalid')

export const visibleAccountEmail = (user) => {
  const contactEmail = user?.user_metadata?.contact_email || user?.user_metadata?.address?.contact_email
  if (contactEmail) return contactEmail
  return isInternalAuthEmail(user?.email) ? '' : (user?.email || '')
}

export const visibleAccountPhone = (user) =>
  user?.user_metadata?.phone || user?.user_metadata?.address?.phone || user?.phone || ''
