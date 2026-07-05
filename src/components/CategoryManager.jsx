import { useState, useMemo } from 'react'
import { Plus, Trash2, Tag, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function barColor(pct) {
  if (pct >= 100) return '#ef4444'
  if (pct >= 75) return '#f59e0b'
  return '#10b981'
}

export default function CategoryManager() {
  const { categories, transactions, addCategory, updateCategoryBudget, removeCategory, addTransaction, getCatStats, showToast } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [budget, setBudget] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [txnForm, setTxnForm] = useState({ catId: null, amount: '', date: '', description: '' })
  const [overConfirm, setOverConfirm] = useState(null)

  const catTxns = useMemo(() => {
    const map = {}
    (categories ?? []).forEach((c) => { map[c.id] = [] })
    (transactions ?? []).forEach((t) => {
      if (map[t.categoryId]) map[t.categoryId].push(t)
    })
    return map
  }, [categories, transactions])

  const handleAdd = () => {
    if (!name.trim()) return
    addCategory(name.trim(), color, parseFloat(budget) || 0)
    setName('')
    setColor('#3b82f6')
    setBudget('')
    setShowForm(false)
  }

  const doAddTxn = (catId) => {
    const val = parseFloat(txnForm.amount)
    if (isNaN(val) || val <= 0) return
    const stats = getCatStats(catId)
    if (stats.budget > 0 && val > stats.remaining) {
      setOverConfirm({ catId, amount: val, description: txnForm.description, date: txnForm.date })
      return
    }
    addTransaction(val, catId, txnForm.description, new Date(txnForm.date || new Date()).toISOString())
    const newPct = stats.budget > 0 ? ((stats.spent + val) / stats.budget) * 100 : 0
    if (newPct >= 90) {
      showToast(`⚠️ لقد استهلكت ${newPct.toFixed(0)}% من رصيد ${stats.cat?.name}`, 'warning')
    }
    setTxnForm({ catId: null, amount: '', date: '', description: '' })
  }

  const confirmOverBudget = () => {
    if (!overConfirm) return
    addTransaction(overConfirm.amount, overConfirm.catId, overConfirm.description, new Date(overConfirm.date || new Date()).toISOString())
    const stats = getCatStats(overConfirm.catId)
    showToast(`⚠️ تم تجاوز رصيد ${stats.cat?.name}`, 'danger')
    setOverConfirm(null)
    setTxnForm({ catId: null, amount: '', date: '', description: '' })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-gray-800">المحفظات</h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-sm bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> إضافة محفظة
          </button>
        </div>

        {showForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="اسم المحفظة"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3 outline-none focus:border-purple-400"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <div className="flex flex-wrap gap-2 mb-3">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 cursor-pointer ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
              placeholder="المبلغ المخصص (د.ع)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3 outline-none focus:border-purple-400" min="0" />
            <button onClick={handleAdd}
              className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 cursor-pointer">
              إضافة محفظة
            </button>
          </div>
        )}

        {(categories ?? []).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">لا توجد محفظات بعد</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(categories ?? []).map((cat) => {
              const stats = getCatStats(cat.id)
              const pct = stats.budget > 0 ? Math.min((stats.spent / stats.budget) * 100, 100) : 0
              const txns = catTxns[cat.id] || []
              return (
                <div key={cat.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-bold text-gray-800">{cat.name}</span>
                      {pct >= 90 && (
                        <AlertTriangle className={`w-4 h-4 ${pct >= 100 ? 'text-red-500' : 'text-amber-500'}`} />
                      )}
                    </div>
                    <button onClick={() => removeCategory(cat.id)}
                      className="text-gray-300 hover:text-red-500 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-2 text-xs">
                    <input type="number" value={cat.budget || ''}
                      onChange={(e) => updateCategoryBudget(cat.id, parseFloat(e.target.value) || 0)}
                      className="w-24 border border-gray-200 rounded px-2 py-1 text-center outline-none focus:border-purple-400"
                      placeholder="الرصيد" min="0" />
                    <span className="text-gray-400">|</span>
                    <span className={`font-medium ${pct >= 75 ? 'text-red-500' : 'text-gray-600'}`}>
                      {(stats.spent ?? 0).toLocaleString('en-US')} د.ع
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className={`font-medium ${stats.remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(stats.remaining ?? 0).toLocaleString('en-US')} د.ع
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-gray-100 rounded-full mb-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: pct + '%', backgroundColor: barColor(pct) }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{(stats.budget ?? 0).toLocaleString('en-US')} د.ع</span>
                    <span style={{ color: barColor(pct) }} className="font-medium">{pct.toFixed(0)}%</span>
                  </div>

                  <button onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 cursor-pointer">
                    {expandedId === cat.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expandedId === cat.id ? 'إخفاء المعاملات' : 'عرض المعاملات'}
                  </button>

                  {expandedId === cat.id && (
                    <div className="mt-3 space-y-2">
                      {txnForm.catId === cat.id ? (
                        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                          <input type="number" value={txnForm.amount}
                            onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
                            placeholder="المبلغ"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-purple-400" min="1" />
                          <input type="date" value={txnForm.date}
                            onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-purple-400" />
                          <input type="text" value={txnForm.description}
                            onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })}
                            placeholder="ملاحظة"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-purple-400" />
                          <div className="flex gap-2">
                            <button onClick={() => setTxnForm({ ...txnForm, catId: null })}
                              className="flex-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded hover:bg-gray-100 cursor-pointer">
                              إلغاء
                            </button>
                            <button onClick={() => doAddTxn(cat.id)}
                              className="flex-1 text-xs bg-emerald-500 text-white py-1.5 rounded hover:bg-emerald-600 cursor-pointer">
                              إضافة
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setTxnForm({ catId: cat.id, amount: '', date: today, description: '' })}
                          className="w-full text-xs border border-dashed border-gray-300 text-gray-500 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                          + إضافة مصروف
                        </button>
                      )}
                      {txns.length === 0 && txnForm.catId !== cat.id ? (
                        <p className="text-xs text-gray-400 text-center py-3">لا توجد معاملات</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {txns.map((txn) => (
                            <div key={txn.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">{new Date(txn.date).toLocaleDateString('en-US')}</span>
                                {txn.description && <span className="text-gray-500 truncate max-w-24">{txn.description}</span>}
                              </div>
                              <span className="font-medium text-red-500">-{(txn.amount ?? 0).toLocaleString('en-US')} د.ع</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
