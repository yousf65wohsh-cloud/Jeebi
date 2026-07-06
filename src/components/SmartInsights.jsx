import { useState, useEffect, useRef, useMemo } from 'react'
import { Lightbulb, TrendingDown, PiggyBank, Target, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'

function fmt(n) {
  return (n ?? 0).toLocaleString('en-US')
}

function AnimatedNumber({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    const target = value ?? 0
    if (target === 0) { setDisplay(0); return }
    const duration = 800
    startRef.current = performance.now()
    const animate = (now) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(target * eased)
      if (progress < 1) raf.current = requestAnimationFrame(animate)
      else setDisplay(target)
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])

  return <>{fmt(display)}{suffix}</>
}

function CircularProgress({ pct, color, size = 60, stroke = 5 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  const raf = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    const target = Math.min(pct ?? 0, 100)
    if (target === 0) { setOffset(circ); return }
    const duration = 900
    startRef.current = performance.now()
    const animate = (now) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setOffset(circ - (circ * target / 100) * eased)
      if (progress < 1) raf.current = requestAnimationFrame(animate)
      else setOffset(circ - circ * target / 100)
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [pct, circ])

  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  )
}

export default function SmartInsights() {
  const { transactions = [], balance = 0, savings = 0, goals = [] } = useApp()

  const insights = useMemo(() => {
    const now = Date.now()

    const totalExp = transactions.reduce((s, t) => s + (t.amount ?? 0), 0)
    let avgDaily = 0, avgMonthly = 0

    if (transactions.length > 0) {
      const dates = transactions.map(t => new Date(t.date).getTime()).filter(d => !isNaN(d))
      if (dates.length > 0) {
        const daysSpan = Math.max(1, Math.ceil((now - Math.min(...dates)) / 86400000))
        avgDaily = totalExp / daysSpan
        avgMonthly = avgDaily * 30
      }
    }

    const r = []
    const months = avgMonthly > 0 ? balance / avgMonthly : 0
    const days = avgDaily > 0 ? balance / avgDaily : 0
    const runwayMonths = Math.floor(months)
    const runwayDays = Math.round((months - runwayMonths) * 30)
    r.push({ type: 'runway', months: runwayMonths, days: runwayDays, totalDays: days, avgDaily, avgMonthly })

    if (avgDaily > 0) {
      const extension = Math.round((balance / (avgDaily * 0.9)) - days)
      r.push({ type: 'tip', extension })
    }

    const savingsMonths = avgMonthly > 0 ? savings / avgMonthly : 0
    r.push({ type: 'savings', months: Math.floor(savingsMonths), days: Math.round((savingsMonths - Math.floor(savingsMonths)) * 30), totalMonths: savingsMonths })

    const activeGoals = (goals ?? []).filter(g => g.status === 'active' && (g.transfer_amount ?? 0) > 0)
    if (activeGoals.length > 0) {
      const nearest = activeGoals.reduce((a, b) => {
        const aRem = ((a.target_amount ?? 0) - (a.saved_amount ?? 0)) / (a.transfer_amount ?? 1)
        const bRem = ((b.target_amount ?? 0) - (b.saved_amount ?? 0)) / (b.transfer_amount ?? 1)
        return aRem < bRem ? a : b
      })
      const remaining = (nearest.target_amount ?? 0) - (nearest.saved_amount ?? 0)
      r.push({ type: 'goal', title: nearest.title, months: Math.ceil(remaining / (nearest.transfer_amount ?? 1)), pct: nearest.target_amount > 0 ? ((nearest.saved_amount ?? 0) / nearest.target_amount) * 100 : 0 })
    }

    return r
  }, [transactions, balance, savings, goals])

  const runwayData = insights.find(i => i.type === 'runway')
  const tipData = insights.find(i => i.type === 'tip')
  const savingsData = insights.find(i => i.type === 'savings')
  const goalData = insights.find(i => i.type === 'goal')
  const avgDaily = runwayData?.avgDaily ?? 0

  const runwayDays = runwayData?.totalDays ?? 0
  const runwayPct = runwayDays > 0 ? Math.min((runwayDays / 365) * 100, 100) : 0
  const runwayColor = runwayDays >= 90 ? '#10b981' : runwayDays >= 30 ? '#f59e0b' : '#ef4444'
  const savingsPct = savingsData ? Math.min((savingsData.totalMonths / 12) * 100, 100) : 0
  const savingsColor = savingsPct >= 75 ? '#10b981' : savingsPct >= 40 ? '#f59e0b' : '#ef4444'
  const showWarning = runwayDays < 30 && runwayDays > 0

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-gray-800">الرؤية المالية</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showWarning && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 col-span-full flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">تنبيه!</p>
              <p className="text-xs text-red-600 mt-1">
                إذا استمر إنفاقك بهذا المعدل، سينفد رصيدك خلال <strong>{Math.round(runwayDays)}</strong> يومًا.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <CircularProgress pct={runwayPct} color={runwayColor} />
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">مدة كفاية الرصيد</p>
            <p className="text-sm font-bold text-gray-800">
              <AnimatedNumber value={runwayData?.months ?? 0} /> شهرًا
              {runwayData?.days > 0 && <> و <AnimatedNumber value={runwayData.days} /> يومًا</>}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              بمعدل <AnimatedNumber value={avgDaily} /> د.ع/يوم
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center shrink-0 ${savingsPct >= 75 ? 'bg-green-50' : savingsPct >= 40 ? 'bg-amber-50' : 'bg-red-50'}`}>
            <PiggyBank className={`w-6 h-6 ${savingsPct >= 75 ? 'text-green-500' : savingsPct >= 40 ? 'text-amber-500' : 'text-red-500'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">تغطية المدخرات</p>
            <p className="text-sm font-bold text-gray-800">
              <AnimatedNumber value={savingsData?.months ?? 0} /> شهرًا
              {savingsData?.days > 0 && <> و <AnimatedNumber value={savingsData.days} /> يومًا</>}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              <AnimatedNumber value={savings} /> د.ع مدخرات
            </p>
          </div>
        </div>

        {tipData && tipData.extension > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <TrendingDown className="w-6 h-6 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1">نصيحة ذكية</p>
              <p className="text-sm font-bold text-blue-700">
                خفض 10% من مصاريفك يطيل رصيدك
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                <AnimatedNumber value={tipData.extension} /> يومًا إضافيًا
              </p>
            </div>
          </div>
        )}

        {goalData ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-full bg-purple-50 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-purple-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 mb-1">الهدف الأقرب</p>
              <p className="text-sm font-bold text-gray-800 truncate">{goalData.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    style={{ width: Math.min(goalData.pct, 100) + '%' }}
                  />
                </div>
                <span className="text-xs text-gray-500 shrink-0">{goalData.months} أشهر</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 opacity-50">
            <div className="w-[60px] h-[60px] rounded-full bg-gray-50 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-gray-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1">الأهداف</p>
              <p className="text-sm text-gray-400">لا توجد أهداف نشطة</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
