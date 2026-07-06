import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'

export default function TransactionForm() {
  const { categories = [], addTransaction = () => {}, showToast = () => {} } = useApp()
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(categories[0].id)
  }, [categories, categoryId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0 || !categoryId) return
    addTransaction(val, categoryId, description.trim(), new Date().toISOString())
    setAmount('')
    setDescription('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  if (categories.length === 0) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input ref={inputRef} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-3xl outline-none focus:border-emerald-400" required min="1" autoFocus />
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 bg-white text-sm">
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </div>
      <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="ملاحظة (اختياري)" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-400 text-sm" />
      <button type="submit" className="w-full bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 transition-colors cursor-pointer text-base">
        إضافة المصروف
      </button>
    </form>
  )
}
