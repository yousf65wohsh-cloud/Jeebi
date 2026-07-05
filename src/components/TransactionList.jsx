import { useState } from 'react'
import { Trash2, Receipt, Pencil, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import EditTransactionModal from './EditTransactionModal'

export default function TransactionList() {
  const { transactions, categories, removeTransaction } = useApp()
  const [editTxn, setEditTxn] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const getCategory = (id) => (categories ?? []).find((c) => c.id === id)

  const confirmDelete = () => {
    if (deleteId) {
      removeTransaction(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-800">آخر المعاملات</h2>
        </div>
        {(transactions ?? []).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">لا توجد معاملات بعد</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(transactions ?? []).map((txn) => {
              const cat = getCategory(txn.categoryId)
              return (
                <div
                  key={txn.id}
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
                        {txn.description && <span className="truncate">{txn.description}</span>}
                        {txn.date && (
                          <span>{new Date(txn.date).toLocaleDateString('en-US')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-red-500">
                      -{(txn.amount ?? 0).toLocaleString('en-US')} د.ع
                    </span>
                    <button
                      onClick={() => setEditTxn(txn)}
                      className="text-gray-300 hover:text-blue-500 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(txn.id)}
                      className="text-gray-300 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
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
