import { useState } from 'react'
import { Plus, MoreVertical, Target, Pencil, Play, Pause, CheckCircle, Trash2, AlertTriangle, X, ArrowUpRight } from 'lucide-react'
import { useApp } from '../context/AppContext'

const FREQ_LABELS = { daily: 'يومياً', weekly: 'أسبوعياً', monthly: 'شهرياً' }

function GoalForm({ goal, onSave, onCancel }) {
  const [title, setTitle] = useState(goal?.title || '')
  const [emoji, setEmoji] = useState(goal?.emoji || '')
  const [targetAmount, setTargetAmount] = useState(goal?.target_amount || '')
  const [frequency, setFrequency] = useState(goal?.frequency || 'monthly')
  const [contributionAmount, setContributionAmount] = useState(goal?.contribution_amount || '')
  const [startDate, setStartDate] = useState(goal?.start_date || new Date().toISOString().slice(0, 10))
  const [targetDate, setTargetDate] = useState(goal?.target_date || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      emoji: emoji.trim(),
      target_amount: parseFloat(targetAmount) || 0,
      frequency,
      contribution_amount: parseFloat(contributionAmount) || 0,
      start_date: startDate,
      target_date: targetDate,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="اسم الهدف" required
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400"
      />
      <div className="flex gap-3">
        <input
          type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)}
          placeholder="🚀" maxLength={4}
          className="w-16 border border-gray-200 rounded-lg px-3 py-2.5 text-center outline-none focus:border-purple-400"
        />
        <input
          type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="المبلغ المستهدف" required min="1"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400"
        />
      </div>
      <div className="flex gap-3">
        <input
          type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400 text-sm"
        />
        <input
          type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
          placeholder="تاريخ الهدف"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400 text-sm"
        />
      </div>
      <div className="flex gap-3">
        <select
          value={frequency} onChange={(e) => setFrequency(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400 bg-white"
        >
          <option value="daily">يومياً</option>
          <option value="weekly">أسبوعياً</option>
          <option value="monthly">شهرياً</option>
        </select>
        <input
          type="number" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)}
          placeholder="مبلغ الادخار" required min="1"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
          إلغاء
        </button>
        <button type="submit"
          className="flex-1 bg-purple-500 text-white py-2.5 rounded-lg font-medium hover:bg-purple-600 cursor-pointer">
          {goal ? 'حفظ' : 'إضافة هدف'}
        </button>
      </div>
    </form>
  )
}

export default function Goals() {
  const { goals = [], addGoal = () => {}, updateGoal = () => {}, deleteGoal = () => {}, pauseGoal = () => {}, resumeGoal = () => {}, completeGoal = () => {}, showToast = () => {} } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [menuGoalId, setMenuGoalId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const handleAdd = (data) => {
    addGoal(data)
    setShowForm(false)
    showToast('تم إضافة الهدف بنجاح', 'info')
  }

  const handleUpdate = (data) => {
    updateGoal(editingGoal.id, data)
    setEditingGoal(null)
    showToast('تم تحديث الهدف', 'info')
  }

  const handleDelete = () => {
    if (!deleteConfirm) return
    deleteGoal(deleteConfirm)
    setDeleteConfirm(null)
    showToast('تم حذف الهدف', 'info')
  }

  const handleComplete = (id) => {
    completeGoal(id)
    setMenuGoalId(null)
    showToast('🎉 تم إكمال الهدف!', 'info')
  }

  const handlePauseResume = (goal) => {
    if (goal.status === 'active') {
      pauseGoal(goal.id)
      showToast('تم إيقاف الهدف مؤقتاً', 'info')
    } else {
      resumeGoal(goal.id)
      showToast('تم استئناف الهدف', 'info')
    }
    setMenuGoalId(null)
  }

  const sorted = [...(goals ?? [])].sort((a, b) => {
    const order = { active: 0, paused: 1, completed: 2 }
    return (order[a.status] ?? 1) - (order[b.status] ?? 1)
  })

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-gray-800">الأهداف</h2>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingGoal(null) }}
            className="flex items-center gap-1 text-sm bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> إضافة هدف
          </button>
        </div>

        {showForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl">
            <GoalForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {sorted.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">لا توجد أهداف بعد</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {sorted.map((goal) => {
              const pct = goal.target_amount > 0 ? Math.min((goal.saved_amount / goal.target_amount) * 100, 100) : 0
              return (
                <div key={goal.id} className="border border-gray-100 rounded-xl p-3 md:p-4 hover:shadow-sm transition-shadow relative">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {goal.emoji && <span className="text-xl leading-none">{goal.emoji}</span>}
                      <span className="font-bold text-gray-800 truncate">{goal.title}</span>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setMenuGoalId(menuGoalId === goal.id ? null : goal.id)}
                        className="text-gray-300 hover:text-gray-600 p-1 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuGoalId === goal.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuGoalId(null)} />
                          <div className="absolute left-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 min-w-[140px]">
                            <button
                              onClick={() => { setEditingGoal(goal); setMenuGoalId(null); setShowForm(false) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" /> تعديل
                            </button>
                            {goal.status !== 'completed' && (
                              <button
                                onClick={() => handlePauseResume(goal)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                              >
                                {goal.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                {goal.status === 'active' ? 'إيقاف مؤقت' : 'استئناف'}
                              </button>
                            )}
                            {goal.status === 'active' && (
                              <button
                                onClick={() => handleComplete(goal.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> إكمال
                              </button>
                            )}
                            <button
                              onClick={() => { setDeleteConfirm(goal.id); setMenuGoalId(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> حذف
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-2">
                    {goal.saved_amount.toLocaleString('en-US')} / {goal.target_amount.toLocaleString('en-US')} د.ع
                  </div>

                  <div className="w-full h-2 bg-gray-100 rounded-full mb-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: pct + '%',
                        backgroundColor: goal.status === 'completed' ? '#10b981' : pct >= 100 ? '#10b981' : '#8b5cf6',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium" style={{ color: goal.status === 'completed' ? '#10b981' : '#8b5cf6' }}>
                      {pct.toFixed(0)}%
                    </span>
                    <span className="text-gray-400">
                      {goal.contribution_amount.toLocaleString('en-US')} د.ع/{FREQ_LABELS[goal.frequency] || goal.frequency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    {goal.status === 'completed' ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> مكتمل
                      </span>
                    ) : goal.status === 'paused' ? (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <Pause className="w-3.5 h-3.5" /> متوقف
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" /> قيد التنفيذ
                      </span>
                    )}
                  </div>

                  {editingGoal?.id === goal.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-medium text-gray-600 mb-2">تعديل الهدف</p>
                      <GoalForm goal={goal} onSave={handleUpdate} onCancel={() => setEditingGoal(null)} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-6">هل أنت متأكد من حذف هذا الهدف؟</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                إلغاء
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium hover:bg-red-600 cursor-pointer">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
