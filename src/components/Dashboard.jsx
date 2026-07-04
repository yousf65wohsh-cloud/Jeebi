import { Wallet, TrendingDown, PiggyBank } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useState } from 'react'

export default function Dashboard() {
  const { balance, remainingBalance, totalExpenses, setBalance } = useApp()
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const handleSave = () => {
    const val = parseFloat(inputVal)
    if (!isNaN(val) && val >= 0) {
      setBalance(val)
    }
    setEditing(false)
    setInputVal('')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-sm font-medium">الرصيد الكلي</span>
          <Wallet className="w-5 h-5 text-blue-500" />
        </div>
        {editing ? (
          <div className="flex gap-2">
            <input
              type="number"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1 text-lg font-bold outline-none focus:border-blue-400"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 cursor-pointer"
            >
              حفظ
            </button>
          </div>
        ) : (
          <div
            className="text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600"
            onClick={() => setEditing(true)}
          >
            {balance.toLocaleString('en-US')} د.ع
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">اضغط لتعديل الرصيد</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-sm font-medium">إجمالي المصاريف</span>
          <TrendingDown className="w-5 h-5 text-red-500" />
        </div>
        <div className="text-2xl font-bold text-red-500">
          {totalExpenses.toLocaleString('en-US')} د.ع
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-sm font-medium">الرصيد المتبقي</span>
          <PiggyBank className="w-5 h-5 text-green-500" />
        </div>
        <div
          className={`text-2xl font-bold ${remainingBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}
        >
          {remainingBalance.toLocaleString('en-US')} د.ع
        </div>
      </div>
    </div>
  )
}
