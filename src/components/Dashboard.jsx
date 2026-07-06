import { Wallet, PiggyBank, TrendingDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useState } from 'react'

export default function Dashboard() {
  const { balance = 0, savings = 0, transactions = [], setBalance = () => {} } = useApp()
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const todayStr = new Date().toISOString().slice(0, 10)
  const todaySpending = (transactions ?? [])
    .filter(t => t.amount < 0 && t.date?.slice(0, 10) === todayStr)
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const handleSave = () => {
    const val = parseFloat(inputVal)
    if (!isNaN(val) && val >= 0 && typeof setBalance === 'function') setBalance(val)
    setEditing(false); setInputVal('')
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 col-span-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-xs font-medium">الرصيد</span>
          <Wallet className="w-4 h-4 text-blue-500" />
        </div>
        {editing ? (
          <div className="flex gap-2">
            <input type="number" value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className="w-full border border-gray-200 rounded-lg px-3 py-1 text-xl font-bold outline-none focus:border-blue-400" autoFocus />
            <button onClick={handleSave} className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 cursor-pointer">حفظ</button>
          </div>
        ) : (
          <div className="text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600" onClick={() => setEditing(true)}>
            {(balance ?? 0).toLocaleString('en-US')} <span className="text-sm font-normal text-gray-400">د.ع</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500 text-[10px] font-medium">مدخرات</span>
          <PiggyBank className="w-3.5 h-3.5 text-green-500" />
        </div>
        <div className="text-lg font-bold text-green-600">{(savings ?? 0).toLocaleString('en-US')}</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 col-span-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500 text-xs font-medium">مصروفات اليوم</span>
          <TrendingDown className="w-4 h-4 text-red-400" />
        </div>
        <div className="text-lg font-bold text-red-500">{(todaySpending ?? 0).toLocaleString('en-US')} د.ع</div>
      </div>
    </div>
  )
}
