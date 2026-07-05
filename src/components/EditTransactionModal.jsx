import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function EditTransactionModal({ transaction, onClose }) {
  const { categories = [], updateTransaction = () => {} } = useApp()
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!transaction) return
    setAmount(String(transaction.amount))
    setCategoryId(transaction.categoryId)
    setDate(transaction.date ? transaction.date.slice(0, 10) : '')
    setDescription(transaction.description || '')
  }, [transaction])

  const handleSubmit = (e) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0 || !categoryId) return
    const updates = { amount: val, categoryId, description: description.trim() }
    if (date) updates.date = new Date(date + 'T00:00:00').toISOString()
    if (typeof updateTransaction === 'function') updateTransaction(transaction.id, updates)
    onClose()
  }

  if (!transaction) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">تعديل المعاملة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">المبلغ</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-400"
              required
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">المحفظة</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-400 bg-white"
            >
              {(categories ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">التاريخ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ملاحظة</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ملاحظة (اختياري)"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 cursor-pointer"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
