import { useState } from 'react'
import { PiggyBank, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatSafeDate } from '../services/utils'

export default function Savings() {
  const { savings = 0, transfers = [], transferToSavings = () => {}, withdrawFromSavings = () => {}, showToast = () => {} } = useApp()
  const [transferAmount, setTransferAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const handleTransfer = (e) => {
    e.preventDefault()
    transferToSavings(transferAmount)
    setTransferAmount('')
  }

  const handleWithdraw = (e) => {
    e.preventDefault()
    withdrawFromSavings(withdrawAmount)
    setWithdrawAmount('')
  }

  const recentTransfers = (transfers ?? []).slice(0, 10)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <PiggyBank className="w-5 h-5 text-green-500" />
        <h2 className="text-lg font-bold text-gray-800">المدخرات</h2>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 md:p-5 mb-4">
        <p className="text-sm text-green-700 font-medium mb-1">إجمالي المدخرات</p>
        <p className="text-2xl md:text-3xl font-bold text-green-600">
          {(savings ?? 0).toLocaleString('en-US')} د.ع
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <form onSubmit={handleTransfer} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">تحويل إلى المدخرات</label>
          <input
            type="number"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="المبلغ"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-green-400"
            min="1"
          />
          <button
            type="submit"
            className="w-full bg-green-500 text-white py-3 rounded-lg font-medium text-sm hover:bg-green-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            تحويل إلى المدخرات
          </button>
        </form>

        <form onSubmit={handleWithdraw} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">سحب من المدخرات</label>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="المبلغ"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-amber-400"
            min="1"
          />
          <button
            type="submit"
            className="w-full bg-amber-500 text-white py-3 rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowDownLeft className="w-4 h-4" />
            سحب من المدخرات
          </button>
        </form>
      </div>

      {recentTransfers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">آخر التحويلات</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {recentTransfers.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  {t.type === 'deposit' ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="text-gray-600">
                    {t.type === 'deposit' ? 'تحويل إلى المدخرات' : 'سحب من المدخرات'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400" dir="ltr">{t.date ? formatSafeDate(t.date) : ''}</span>
                  <span className={`font-medium ${t.type === 'deposit' ? 'text-green-600' : 'text-amber-600'}`}>
                    {(t.amount ?? 0).toLocaleString('en-US')} د.ع
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
