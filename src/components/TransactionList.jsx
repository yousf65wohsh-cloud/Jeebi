import { useState, useMemo } from 'react'
import { Trash2, Receipt, Pencil, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatSafeDate } from '../services/utils'
import EditTransactionModal from './EditTransactionModal'
import FilterBar from './FilterBar'

function applyFilters(raw, filters) {
  let list = Array.isArray(raw) ? raw : []
  const f = typeof filters === 'object' && filters !== null ? filters : {}

  if (f.search) {
    const q = f.search.toLowerCase()
    list = list.filter((t) => (t.description ?? '').toLowerCase().includes(q))
  }
  if (f.categoryId) {
    list = list.filter((t) => t.categoryId === f.categoryId)
  }
  if (f.dateFrom) {
    list = list.filter((t) => (t.date ?? '') >= f.dateFrom)
  }
  if (f.dateTo) {
    list = list.filter((t) => (t.date ?? '') <= f.dateTo)
  }
  if (f.amountMin !== '') {
    const min = parseFloat(f.amountMin)
    if (!isNaN(min)) list = list.filter((t) => (t.amount ?? 0) >= min)
  }
  if (f.amountMax !== '') {
    const max = parseFloat(f.amountMax)
    if (!isNaN(max)) list = list.filter((t) => (t.amount ?? 0) <= max)
  }

  return list
}

const INITIAL_FILTERS = { search: '', categoryId: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' }

export default function TransactionList() {
  const { transactions = [], categories = [], removeTransaction = () => {} } = useApp()
  const [editTxn, setEditTxn] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const getCategory = (id) => (categories ?? []).find((c) => c.id === id)

  const filtered = useMemo(
    () => applyFilters(transactions, filters),
    [JSON.stringify(transactions), JSON.stringify(filters)]
  )

  const hasFilters = Object.values(filters).some((v) => v !== '')

  const confirmDelete = () => {
    if (deleteId && typeof removeTransaction === 'function') {
      removeTransaction(deleteId)
      setDeleteId(null)
    }
  }

  const handleReset = () => setFilters(INITIAL_FILTERS)

  const safeTxnList = filtered ?? []
  const rawCount = (transactions ?? []).length

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-800">آخر المعاملات</h2>
            {hasFilters && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                {safeTxnList.length} من {rawCount}
              </span>
            )}
          </div>
        </div>

        <FilterBar filters={filters} setFilters={setFilters} onReset={handleReset} />

        {rawCount === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">لا توجد معاملات بعد</p>
        ) : safeTxnList.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">لا توجد معاملات تطابق الفلتر</p>
        ) : (
          <div className="space-y-2 md:max-h-80 overflow-y-auto">
            {safeTxnList.map((txn) => {
              if (!txn) return null
              const cat = getCategory(txn.categoryId)
              return (
                <div
                  key={txn.id ?? Math.random()}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color || '#9ca3af' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {cat?.name || 'غير محدد'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {txn?.description && <span className="truncate">{txn.description}</span>}
                        {txn?.date && <span>{formatSafeDate(txn.date)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 shrink-0">
                    <span className="text-sm font-bold text-red-500">
                      -{(txn?.amount ?? 0).toLocaleString('en-US')} د.ع
                    </span>
                    <button
                      onClick={() => setEditTxn(txn)}
                      className="text-gray-300 hover:text-blue-500 p-1 md:p-0 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <button
                      onClick={() => txn?.id && setDeleteId(txn.id)}
                      className="text-gray-300 hover:text-red-500 p-1 md:p-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editTxn && (
        <EditTransactionModal
          transaction={editTxn}
          onClose={() => setEditTxn(null)}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-6">هل أنت متأكد من حذف هذه المعاملة؟</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium hover:bg-red-600 cursor-pointer"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
