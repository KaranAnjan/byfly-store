import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { UserPlus, RefreshCw } from 'lucide-react'
import { isInternalAuthEmail } from '../../lib/accountIdentity'

const ManageWholesaleAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [recentLogins, setRecentLogins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', business_name: '', email: '', phone: '' })

  const loadAccounts = async () => {
    setLoading(true)
    const [{ data, error }, { data: logins, error: loginError }] = await Promise.all([
      supabase.from('wholesale_accounts')
        .select('user_id,business_name,is_active,created_at,users(name,email,phone)')
        .order('created_at', { ascending: false }),
      supabase.from('wholesale_login_events')
        .select('id,user_id,logged_in_at,auth_method,users(name,email,phone)')
        .order('logged_in_at', { ascending: false }).limit(30),
    ])
    if (error) toast.error(error.message)
    if (loginError) toast.error(loginError.message)
    setRecentLogins(logins || [])
    setAccounts((data || []).map((account) => ({
      ...account,
      id: account.user_id,
      name: account.users?.name || '',
      email: isInternalAuthEmail(account.users?.email) ? '' : (account.users?.email || ''),
      phone: account.users?.phone || '',
      wholesale_enabled: account.is_active,
    })))
    setLoading(false)
  }
  useEffect(() => { loadAccounts() }, [])

  const createAccount = async (event) => {
    event.preventDefault()
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('create-wholesale-user', { body: form })
    if (error || data?.error) toast.error(data?.error || error.message)
    else {
      toast.success(data?.message || `Wholesale access enabled for ${form.email}`)
      setForm({ name: '', business_name: '', email: '', phone: '' })
      loadAccounts()
    }
    setSaving(false)
  }

  const toggleAccess = async (account) => {
    const { error } = await supabase.from('wholesale_accounts')
      .update({ is_active: !account.wholesale_enabled, updated_at: new Date().toISOString() })
      .eq('user_id', account.id)
    if (error) toast.error(error.message)
    else { toast.success(account.wholesale_enabled ? 'Wholesale access paused' : 'Wholesale access enabled'); loadAccounts() }
  }

  return <div className="mx-auto max-w-5xl">
    <h1 className="mb-6 text-2xl font-bold text-slate-900">Wholesale Accounts</h1>
    <form onSubmit={createAccount} className="mb-8 grid gap-4 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm md:grid-cols-4">
      <div className="md:col-span-4"><h2 className="font-semibold text-slate-900">Invite a wholesale customer</h2><p className="text-sm text-slate-500">They get wholesale access as soon as they sign in. Retail customer accounts can also sign in here.</p></div>
      <input required placeholder="Contact name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input required placeholder="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input required type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input type="tel" placeholder="Phone with country code (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"><UserPlus size={17} />{saving ? 'Sending…' : 'Send invitation'}</button>
    </form>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="font-semibold">Wholesale customers</h2><button onClick={loadAccounts} className="text-emerald-700" aria-label="Refresh"><RefreshCw size={17} /></button></div>
      {loading ? <p className="p-6 text-slate-500">Loading accounts…</p> : accounts.length === 0 ? <p className="p-6 text-slate-500">No wholesale accounts yet.</p> : <div className="divide-y divide-slate-100">{accounts.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium text-slate-900">{account.business_name || 'Business not set'}</p><p className="text-sm text-slate-600">{[account.name, account.email, account.phone].filter(Boolean).join(' · ')}</p></div><button onClick={() => toggleAccess(account)} className={`rounded-lg px-3 py-2 text-sm font-medium ${account.wholesale_enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{account.wholesale_enabled ? 'Active · pause access' : 'Paused · enable access'}</button></div>)}</div>}
    </div>
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold">Recent wholesale sign-ins</h2><p className="text-sm text-slate-500">Latest 30 successful sign-ins</p></div><button onClick={loadAccounts} className="text-emerald-700" aria-label="Refresh sign-ins"><RefreshCw size={17} /></button></div>
      {recentLogins.length === 0 ? <p className="p-5 text-sm text-slate-500">No sign-ins recorded yet.</p> : <div className="divide-y divide-slate-100">{recentLogins.map((login) => <div key={login.id} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><p className="font-medium text-slate-900">{login.users?.name || 'Customer'}</p><p className="text-sm text-slate-600">{[isInternalAuthEmail(login.users?.email) ? '' : login.users?.email, login.users?.phone || (!login.users?.email ? login.user_id : ''), login.auth_method].filter(Boolean).join(' · ')}</p></div><time className="text-sm text-slate-500">{new Date(login.logged_in_at).toLocaleString()}</time></div>)}</div>}
    </div>
  </div>
}

export default ManageWholesaleAccounts
