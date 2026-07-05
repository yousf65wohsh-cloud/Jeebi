import { Wallet, TrendingDown, CircleDollarSign, PiggyBank, Target } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useState } from 'react'

export default function Dashboard({ onGoalsClick }) {
  const { balance = 0, remainingBalance = 0, totalExpenses = 0, savings = 0, goals = [], setBalance = () => {} } = useApp()
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  const handleSave = () => {
    const val = parseFloat(inputVal)
    if (!isNaN(val) && val >= 0 && typeof setBalance === 'function') {
      setBalance(val)
    }
    setEditing(false)
    setInputVal('')
  }

  return (
    <>
      <div className="flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-6 order-2 md:order-1">
          <div className="flex items-center justify-between mb-1 md:mb-2">
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
              className="text-xl md:text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600"
              onClick={() => setEditing(true)}
            >
              {(balance ?? 0).toLocaleString('en-US')} د.ع
            </div>
          )}
          <p className="text-[10px] md:text-xs text-gray-400 mt-1">اضغط لتعديل الرصيد</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-6 order-3 md:order-2">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 text-sm font-medium">إجمالي المصاريف</span>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-red-500">
            {(totalExpenses ?? 0).toLocaleString('en-US')} د.ع
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 order-1 md:order-3">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 text-sm font-medium">الرصيد المتبقي</span>
            <CircleDollarSign className="w-5 h-5 text-teal-500" />
          </div>
          <div
            className={`text-3xl md:text-2xl font-bold ${(remainingBalance ?? 0) >= 0 ? 'text-teal-500' : 'text-red-500'}`}
          >
            {(remainingBalance ?? 0).toLocaleString('en-US')} د.ع
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-6 order-4 md:order-4">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-gray-500 text-sm font-medium">المدخرات</span>
            <PiggyBank className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-green-500">
            {(savings ?? 0).toLocaleString('en-US')} د.ع
          </div>
        </div>
      </div>

      {goals.length > 0 && (
        <button
          onClick={onGoalsClick}
          className="w-full mt-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">الأهداف</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {activeGoals.length > 0 && (
              <span className="text-green-600">{activeGoals.length} قيد التنفيذ</span>
            )}
            {completedGoals.length > 0 && (
              <span className="text-gray-400">{completedGoals.length} مكتمل</span>
            )}
            {goals.length === 0 && (
              <span className="text-gray-400">لا توجد أهداف</span>
            )}
          </div>
        </button>
      )}
    </>
  )
}
