import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { calculateInsights } from '../services/insightsEngine'
import { Lightbulb, TrendingDown, PiggyBank, Target, AlertTriangle, BarChart3, Zap, Award, Sparkles, Sliders, Calendar, DollarSign, ArrowUp, ArrowDown, Clock, Gift, ShieldCheck, Wallet, Brain, Menu } from 'lucide-react'

function fmt(n) { return (n ?? 0).toLocaleString('en-US') }

function AnimatedNumber({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const raf = { current: null }; const start = { current: null }
  const d = display

  // Re-implement with a simpler approach using useState
  const [animated, setAnimated] = useState(0)
  const [prevVal, setPrevVal] = useState(value)

  if (value !== prevVal) {
    setPrevVal(value)
    const target = value ?? 0
    const duration = 800
    const startTime = performance.now()
    const animate = (now) => {
      const p = Math.min((now - startTime) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setAnimated(target * e)
      if (p < 1) requestAnimationFrame(animate)
      else setAnimated(target)
    }
    requestAnimationFrame(animate)
  }

  if (value === 0 && animated === 0) return <>{fmt(0)}{suffix}</>
  return <>{fmt(animated)}{suffix}</>
}

function CircularScore({ value, size = 100, stroke = 8, color = '#10b981', label }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  const [prevVal, setPrevVal] = useState(value)

  if (value !== prevVal) {
    setPrevVal(value)
    const target = Math.min(value ?? 0, 100)
    const duration = 1000
    const startTime = performance.now()
    const animate = (now) => {
      const p = Math.min((now - startTime) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setOffset(circ - (circ * target / 100) * e)
      if (p < 1) requestAnimationFrame(animate)
      else setOffset(circ - circ * target / 100)
    }
    requestAnimationFrame(animate)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <span className="text-center text-xs text-gray-500">{label}</span>
    </div>
  )
}

function GlassCard({ children, className = '' }) {
  return <div className={`bg-white/80 backdrop-blur-sm border border-white/50 shadow-sm rounded-2xl p-4 md:p-5 hover:shadow-md transition-shadow ${className}`}>{children}</div>
}

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <GlassCard className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
      </div>
      {children}
    </GlassCard>
  )
}

function SimulatorPanel({ data, onUpdate }) {
  const [vals, setVals] = useState({ reducePct: 0, addSavings: 0, addBalance: 0, extraIncome: 0 })
  const update = (k, v) => { const n = { ...vals, [k]: Number(v) || 0 }; setVals(n); onUpdate(n) }
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { k: 'reducePct', label: 'تخفيض مصاريف (%)', icon: TrendingDown },
        { k: 'addSavings', label: 'زيادة الادخار (د.ع)', icon: PiggyBank },
        { k: 'addBalance', label: 'تحويل للرصيد (د.ع)', icon: DollarSign },
        { k: 'extraIncome', label: 'زيادة الدخل (د.ع)', icon: Gift },
      ].map(({ k, label, icon: Ic }) => (
        <div key={k} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <Ic className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="number" value={vals[k]} onChange={e => update(k, e.target.value)} placeholder={label} className="w-full bg-transparent text-sm outline-none text-gray-700" />
        </div>
      ))}
    </div>
  )
}

export default function FinancialInsights() {
  const { transactions = [], categories = [], balance = 0, savings = 0, goals = [] } = useApp()
  const [simAdj, setSimAdj] = useState(null)

  const insights = useMemo(() => calculateInsights({ transactions, categories, balance, savings, goals }, simAdj || {}), [transactions, categories, balance, savings, goals, simAdj])

  const { healthScore, grade, runway, forecast, suggestions, goalPredictions, budgetRisks, trends, achievements, summary, catSpending } = insights

  const [simRunway, setSimRunway] = useState(null)
  const [simForecast, setSimForecast] = useState(null)
  const [simScore, setSimScore] = useState(null)

  const handleSimUpdate = (adj) => {
    const r = calculateInsights({ transactions, categories, balance, savings, goals }, adj)
    setSimRunway(r.runway)
    setSimForecast(r.forecast)
    setSimScore(r.healthScore)
  }

  const showSim = simAdj && Object.values(simAdj).some(v => v > 0)

  return (
    <div className="space-y-4 md:space-y-5">

      {/* Section 10: AI Summary */}
      <GlassCard className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border-indigo-100/50">
        <div className="flex items-start gap-3">
          <Brain className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 leading-relaxed">{summary || 'قم بإضافة معاملات مالية للحصول على تحليل ذكي لوضعك المالي.'}</p>
        </div>
      </GlassCard>

      {/* Section 1: Health Score + Runway + Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="flex flex-col items-center justify-center py-6">
          <div className="relative">
            <CircularScore value={healthScore} size={120} stroke={10} color={grade.color} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: grade.color }}>{healthScore}</span>
            </div>
          </div>
          <p className="text-sm font-bold mt-2" style={{ color: grade.color }}>{grade.label}</p>
          <p className="text-xs text-gray-400 mt-1">النتيجة المالية</p>
        </GlassCard>

        <GlassCard className="flex flex-col justify-center">
          <p className="text-xs text-gray-500 mb-1">مدة كفاية الرصيد</p>
          <p className="text-2xl font-bold text-gray-800"><AnimatedNumber value={runway.months} /> شهرًا</p>
          <p className="text-sm text-gray-500">و <AnimatedNumber value={runway.remainderDays} /> يومًا</p>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">مع المدخرات: <span className="font-medium text-emerald-600"><AnimatedNumber value={Math.floor(runway.withSavings / 30)} /> شهرًا</span></p>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col justify-center">
          <p className="text-xs text-gray-500 mb-1">توقعات سنة</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">الرصيد المتوقع</span><span className="font-bold" style={{ color: forecast.balance >= 0 ? '#10b981' : '#ef4444' }}><AnimatedNumber value={forecast.balance} /> د.ع</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">المدخرات</span><span className="font-bold text-amber-600"><AnimatedNumber value={forecast.savings} /> د.ع</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">المصاريف السنوية</span><span className="font-bold text-red-500"><AnimatedNumber value={forecast.expenses} /> د.ع</span></div>
          </div>
        </GlassCard>
      </div>

      {/* Section 4: Smart Suggestions */}
      {suggestions.length > 0 && (
        <Section title="اقتراحات ذكية" icon={Lightbulb}>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                s.type === 'category' ? 'bg-orange-50' :
                s.type === 'savings' ? 'bg-green-50' :
                s.type === 'weeklyAlert' ? 'bg-red-50' : 'bg-blue-50'
              }`}>
                {s.type === 'category' && <TrendingDown className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />}
                {s.type === 'savings' && <PiggyBank className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />}
                {s.type === 'weeklyAlert' && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                {s.type === 'trend' && (s.direction === 'up' ? <ArrowUp className="w-5 h-5 text-red-400 shrink-0 mt-0.5" /> : <ArrowDown className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />)}
                <div>
                  {s.type === 'category' && <p className="text-sm text-gray-700">تنفق <strong>{s.pct.toFixed(0)}%</strong> من أموالك على <strong>{s.title}</strong>. تخفيض 15% قد يوفر ~<strong>{s.yearly.toLocaleString('en-US')} د.ع</strong> سنويًا.</p>}
                  {s.type === 'savings' && <p className="text-sm text-gray-700">توفر حاليًا <strong>{s.current.toFixed(0)}%</strong>. زيادة الادخار إلى <strong>{s.target}%</strong> قد يضيف <strong>{s.extraMonthly.toLocaleString('en-US')} د.ع</strong> شهريًا.</p>}
                  {s.type === 'weeklyAlert' && <p className="text-sm text-gray-700">مصاريف هذا الأسبوع (<strong>{s.weekTotal.toLocaleString('en-US')} د.ع</strong>) تتجاوز متوسطك الشهري (<strong>{s.monthlyAvg.toLocaleString('en-US')} د.ع</strong>).</p>}
                  {s.type === 'trend' && <p className="text-sm text-gray-700">مصاريف <strong>{s.title}</strong> {s.direction === 'up' ? 'في ارتفاع' : 'في انخفاض'} بنسبة <strong>{s.pct}%</strong>.</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Section 5: Goal Predictions */}
      <Section title="توقعات الأهداف" icon={Target}>
        {goalPredictions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لا توجد أهداف نشطة</p>
        ) : (
          <div className="space-y-3">
            {goalPredictions.map(g => (
              <div key={g.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-800 truncate">{g.title}</span>
                  <span className="text-xs font-medium" style={{ color: g.probability > 70 ? '#10b981' : g.probability > 40 ? '#f59e0b' : '#ef4444' }}>{g.probability}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-2 overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: Math.min(g.progressPct, 100) + '%' }} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{g.monthsRemaining} أشهر</span>
                  <span>{g.daysRemaining} يوم</span>
                  <span>{g.progressPct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 6: Budget Risk Detector */}
      <Section title="مراقبة الميزانية" icon={ShieldCheck}>
        {budgetRisks.filter(r => r.budget > 0).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لم تحدد ميزانيات للفئات بعد</p>
        ) : (
          <div className="space-y-2">
            {budgetRisks.filter(r => r.budget > 0).map(r => (
              <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${
                r.status === 'exceeded' ? 'bg-red-50' : r.status === 'warning' ? 'bg-amber-50' : 'bg-gray-50'
              }`}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{r.name}</span>
                    <span className={`text-xs font-bold ${r.status === 'exceeded' ? 'text-red-600' : r.status === 'warning' ? 'text-amber-600' : 'text-green-600'}`}>
                      {r.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      r.status === 'exceeded' ? 'bg-red-500' : r.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                    }`} style={{ width: Math.min(r.pct, 100) + '%' }} />
                  </div>
                </div>
                <div className="text-xs text-gray-400 shrink-0 text-left">
                  <div>{r.spent.toLocaleString('en-US')}</div>
                  <div>/ {r.budget.toLocaleString('en-US')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 7: Spending Trends */}
      <Section title="اتجاهات الإنفاق" icon={BarChart3}>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">هذا الأسبوع vs الأسبوع الماضي</p>
            <p className={`text-lg font-bold mt-1 ${trends.weekChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {trends.weekChange > 0 ? '+' : ''}{trends.weekChange}%
            </p>
            <p className="text-xs text-gray-400">{fmt(trends.thisWeekTotal)} / {fmt(trends.lastWeekTotal)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">هذا الشهر vs الشهر الماضي</p>
            <p className={`text-lg font-bold mt-1 ${trends.monthChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {trends.monthChange > 0 ? '+' : ''}{trends.monthChange}%
            </p>
            <p className="text-xs text-gray-400">{fmt(trends.thisMonthTotal)} / {fmt(trends.prevMonthTotal)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">أكبر معاملة</p>
            <p className="text-sm font-bold text-gray-800 mt-1 truncate">{trends.largestTxn ? fmt(trends.largestTxn.amount) : '-'}</p>
            <p className="text-xs text-gray-400 truncate">{trends.largestTxn?.desc || '-'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">اليوم الأكثر إنفاقًا</p>
            <p className="text-lg font-bold text-gray-800 mt-1">{trends.mostActiveDay || '-'}</p>
          </div>
        </div>
        {trends.topCategories.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">أعلى الفئات إنفاقًا</p>
            <div className="flex flex-wrap gap-2">
              {trends.topCategories.slice(0, 3).map(c => (
                <span key={c.id} className="flex items-center gap-1.5 text-xs bg-gray-50 px-2.5 py-1.5 rounded-lg">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name} ({c.pct.toFixed(0)}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Section 8: What If Simulator */}
      <Section title="محاكي ماذا لو؟" icon={Sliders}>
        <SimulatorPanel data={{ transactions, categories, balance, savings, goals }} onUpdate={handleSimUpdate} />
        {showSim && simRunway && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-xl space-y-2">
            <p className="text-xs font-bold text-indigo-700">نتائج المحاكاة</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <p className="text-xs text-gray-500">مدة الرصيد</p>
                <p className="text-sm font-bold text-indigo-600"><AnimatedNumber value={simRunway.months} /> شهر</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">التوفير السنوي</p>
                <p className="text-sm font-bold text-emerald-600"><AnimatedNumber value={simForecast?.savings ?? 0} /> د.ع</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الدرجة المالية</p>
                <p className="text-sm font-bold" style={{ color: (simScore ?? 0) > 60 ? '#10b981' : '#f59e0b' }}><AnimatedNumber value={simScore ?? 0} /></p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الرصيد المتوقع</p>
                <p className="text-sm font-bold text-gray-700"><AnimatedNumber value={simForecast?.balance ?? 0} /> د.ع</p>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Section 9: Achievements */}
      <Section title="الإنجازات" icon={Award}>
        {achievements.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">استمر في استخدام التطبيق لكسب الإنجازات</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map(a => (
              <div key={a.id} className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-3 text-center">
                <span className="text-2xl">{a.icon}</span>
                <p className="text-xs font-medium text-gray-700 mt-1">{a.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{a.earnedAt ? new Date(a.earnedAt).toLocaleDateString('ar-IQ') : ''}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

    </div>
  )
}
