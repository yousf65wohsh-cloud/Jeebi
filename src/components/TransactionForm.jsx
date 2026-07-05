import { useState, useEffect } from 'react'
import { PlusCircle, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function TransactionForm() {
  const { categories, addTransaction, getCatStats, showToast } = useApp()
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [overConfirm, setOverConfirm] = useState(null)

  useEffect(() => {
    if (!categoryId && (categories ?? []).length > 0) setCategoryId(categories[0].id)
  }, [categories])

  const doSubmit = (force) => {
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0 || !categoryId) return
    if (!force) {
      const stats = typeof getCatStats === 'function' ? getCatStats(categoryId) : { budget: 0, spent: 0, remaining: 0, cat: null }
      if (stats.budget > 0 && val > stats.remaining) {
        setOverConfirm({ val, date, description })
        return
      }
    }
    if (typeof addTransaction === 'function') addTransaction(val, categoryId, description.trim(), new Date(date).toISOString())
    if (typeof getCatStats === 'function') {
      const stats = getCatStats(categoryId)
      const newPct = stats.budget > 0 ? ((stats.spent + val) / stats.budget) * 100 : 0
      if (!force && newPct >= 90 && typeof showToast === 'function') {
        showToast(`⚠️ لقد استهلكت ${newPct.toFixed(0)}% من رصيد ${stats.cat?.name}`, 'warning')
      }
    }
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().slice(0, 10))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    doSubmit(false)
  }

  const confirmOverBudget = () => {
    if (!overConfirm) return
    setOverConfirm(null)
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0 || !categoryId) return
    if (typeof addTransaction === 'function') addTransaction(val, categoryId, description.trim(), new Date(date).toISOString())
    if (typeof getCatStats === 'function') {
      const stats = getCatStats(categoryId)
      if (typeof showToast === 'function') showToast(`⚠️ تم تجاوز رصيد ${stats.cat?.name}`, 'danger')
    }
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().slice(0, 10))
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-gray-800">مصروف جديد</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="المبلغ"
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-emerald-400"
              required
              min="1"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-emerald-400 bg-white"
            >
              {(categories ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-emerald-400"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ملاحظة (اختياري)"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="w-full bg-emerald-500 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 cursor-pointer"
          >
            إضافة المصروف
          </button>
        </form>
      </div>

      {overConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">تجاوز الرصيد!</h3>
            <p className="text-sm text-gray-500 mb-2">
              هذا المصروف سيتجاوز الرصيد المخصص لهذه المحفظة.
            </p>
            <p className="text-xs text-gray-400 mb-6">هل تريد المتابعة على أي حال؟</p>
            <div className="flex gap-3">
              <button onClick={() => setOverConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                إلغاء
              </button>
              <button onClick={confirmOverBudget}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium hover:bg-red-600 cursor-pointer">
                متابعة على الرغم من ذلك
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
