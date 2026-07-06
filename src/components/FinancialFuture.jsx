import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { calcStats } from '../services/statisticsService'
import { generateForecast, calcConfidence, calcMilestones, calcRisk, calcHealthScore } from '../services/forecastEngine'
import { generateRecommendations } from '../services/recommendationService'
import { predictGoals } from '../services/predictionService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BarChart3, TrendingDown, TrendingUp, PiggyBank, Target, AlertTriangle,
  DollarSign, ArrowUp, ArrowDown, ShieldCheck, Brain, Sliders, Award,
  Clock, Zap, Sparkles, Lightbulb
} from 'lucide-react'

function fmt(n) { return (n ?? 0).toLocaleString('en-US') }

function AnimatedValue({ value, suffix = '' }) {
  const [animated, setAnimated] = useState(0)
  const [prev, setPrev] = useState(value)

  if (value !== prev) {
    setPrev(value)
    const target = value ?? 0
    const start = performance.now()
    const go = (now) => {
      const p = Math.min((now - start) / 800, 1)
      setAnimated(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) requestAnimationFrame(go)
      else setAnimated(target)
    }
    requestAnimationFrame(go)
  }

  if (value === 0 && animated === 0) return <>{fmt(0)}{suffix}</>
  return <>{fmt(Math.round(animated))}{suffix}</>
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

function ConfidenceGauge({ score, level, color }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * Math.min(score, 100) / 100)
  return (
    <div className="flex items-center justify-center gap-4">
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div>
        <p className="text-2xl font-bold" style={{ color }}>{score}%</p>
        <p className="text-sm text-gray-500">{level}</p>
      </div>
    </div>
  )
}

function ModeBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap ${active ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {label}
    </button>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold" style={{ color: color || '#374151' }}>{value}</span>
    </div>
  )
}

export default function FinancialFuture() {
  const { transactions = [], categories = [], balance = 0, savings = 0, goals = [] } = useApp()

  const [mode, setMode] = useState('current')
  const [savingsIncrease, setSavingsIncrease] = useState(50000)
  const [spendingReduction, setSpendingReduction] = useState(10)
  const [incomeIncrease, setIncomeIncrease] = useState(100000)

  const rawData = useMemo(() => ({ transactions, categories, balance, savings, goals }), [transactions, categories, balance, savings, goals])

  const stats = useMemo(() => calcStats(rawData), [rawData])

  const options = useMemo(() => ({
    mode,
    ...(mode === 'increaseSavings' ? { savingsIncrease } : {}),
    ...(mode === 'reduceSpending' ? { spendingReduction } : {}),
    ...(mode === 'increaseIncome' ? { incomeIncrease } : {}),
  }), [mode, savingsIncrease, spendingReduction, incomeIncrease])

  const forecast = useMemo(() => generateForecast(rawData, options), [rawData, options])
  const confidence = useMemo(() => calcConfidence(stats), [stats])
  const milestones = useMemo(() => calcMilestones(forecast), [forecast])
  const health = useMemo(() => calcHealthScore(stats, categories, goals), [stats, categories, goals])
  const risk = useMemo(() => calcRisk(health.score, forecast.runwayMonths, stats), [health.score, forecast.runwayMonths, stats])
  const recommendations = useMemo(() => generateRecommendations(stats, stats.catSpending, goals, health.score), [stats, health.score, goals])
  const goalPredictions = useMemo(() => predictGoals(goals, stats, forecast.monthlyNet), [goals, stats, forecast.monthlyNet])

  const chartData = forecast.months.map((m, i) => ({
    month: i === 0 ? 'هذا الشهر' : m.month,
    الرصيد: m.balance,
  }))

  const reductionOptions = [5, 10, 15, 20, 25]

  const summaryText = useMemo(() => {
    const parts = []
    parts.push(`بناءً على نشاطك المالي خلال آخر ${Math.round(stats.daysOfHistory)} يومًا، من المتوقع أن يستمر رصيدك لمدة ${Math.floor(forecast.runwayMonths)} أشهر تقريبًا.`)

    const lastMonth = forecast.months[forecast.months.length - 1]
    if (lastMonth && (mode === 'current' || mode === 'reduceSpending')) {
      parts.push(`إذا استمر نمط إنفاقك الحالي، قد يصل رصيدك إلى ${fmt(lastMonth.balance)} د.ع بحلول ${lastMonth.month}.`)
    }

    const catRec = recommendations.find(r => r.type === 'category')
    if (catRec) {
      parts.push(`تخفيض مصاريف ${catRec.title} بنسبة 10% قد يوفر ${fmt(catRec.savings)} د.ع سنويًا.`)
    }

    if (mode === 'increaseSavings' && savingsIncrease > 0) {
      const nearGoal = goalPredictions[0]
      if (nearGoal) {
        parts.push(`زيادة الادخار الشهري بمقدار ${fmt(savingsIncrease)} د.ع قد يمكنك من إكمال هدف "${nearGoal.title}" قبل موعده.`)
      } else {
        parts.push(`زيادة الادخار الشهري بمقدار ${fmt(savingsIncrease)} د.ع يحسن وضعك المالي على المدى البعيد.`)
      }
    }

    return parts.join(' ')
  }, [stats, forecast, mode, savingsIncrease, recommendations, goalPredictions])

  return (
    <div className="space-y-4 md:space-y-5">

      {/* Section 3: AI Financial Forecast Summary */}
      <GlassCard className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border-indigo-100/50">
        <div className="flex items-start gap-3">
          <Brain className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 leading-relaxed">{summaryText}</p>
        </div>
      </GlassCard>

      {/* Section 2: Prediction Modes */}
      <Section title="وضعيات التوقع" icon={Sliders}>
        <p className="text-xs text-gray-400 mb-3">اختر وضعية لمحاكاة سيناريوهات مالية مختلفة</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <ModeBtn active={mode === 'current'} onClick={() => setMode('current')} label="الإنفاق الحالي" />
          <ModeBtn active={mode === 'increaseSavings'} onClick={() => setMode('increaseSavings')} label="زيادة الادخار" />
          <ModeBtn active={mode === 'reduceSpending'} onClick={() => setMode('reduceSpending')} label="تخفيض المصاريف" />
          <ModeBtn active={mode === 'increaseIncome'} onClick={() => setMode('increaseIncome')} label="زيادة الدخل" />
        </div>

        {mode === 'increaseSavings' && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
            <PiggyBank className="w-4 h-4 text-amber-500 shrink-0" />
            <input type="number" value={savingsIncrease} onChange={e => setSavingsIncrease(Number(e.target.value) || 0)} className="w-full bg-transparent text-sm outline-none text-gray-700" placeholder="المبلغ الشهري الإضافي" />
            <span className="text-xs text-gray-400 shrink-0">د.ع/شهر</span>
          </div>
        )}

        {mode === 'reduceSpending' && (
          <div className="space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {reductionOptions.map(pct => (
                <button key={pct} onClick={() => setSpendingReduction(pct)} className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-all ${spendingReduction === pct ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {pct}%
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
              <span>تخفيض المصاريف بنسبة {spendingReduction}% سيضيف ~{fmt(Math.round(stats.monthlyAvg * spendingReduction / 100))} د.ع شهريًا</span>
            </div>
          </div>
        )}

        {mode === 'increaseIncome' && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
            <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
            <input type="number" value={incomeIncrease} onChange={e => setIncomeIncrease(Number(e.target.value) || 0)} className="w-full bg-transparent text-sm outline-none text-gray-700" placeholder="الدخل الإضافي الشهري" />
            <span className="text-xs text-gray-400 shrink-0">د.ع/شهر</span>
          </div>
        )}
      </Section>

      {/* Section 1: Financial Forecast Chart */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-gray-800">التوقعات المالية</h3>
        </div>
        <div className="bg-gray-50/50 rounded-xl p-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v / 1000000).toFixed(v >= 1000000 ? 1 : 0) + 'M'} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', direction: 'rtl' }}
                formatter={(v) => [fmt(v) + ' د.ع', 'الرصيد']}
                labelFormatter={(l) => l}
              />
              <Line type="monotone" dataKey="الرصيد" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3, fill: '#7C3AED' }} activeDot={{ r: 5, fill: '#7C3AED' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Section 4: Prediction Confidence */}
      <Section title="ثقة التوقع" icon={ShieldCheck}>
        <ConfidenceGauge score={confidence.score} level={confidence.level} color={confidence.color} />
      </Section>

      {/* Section 5: Expected Balance Timeline */}
      <Section title="الجدول الزمني للرصيد" icon={Clock}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {milestones.map((m, i) => (
            <div key={i} className={`rounded-xl p-3 text-center ${m.isExhaustion ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className={`text-lg font-bold ${m.isExhaustion ? 'text-red-600' : m.amount >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                <AnimatedValue value={m.amount} /> د.ع
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{m.date.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6: Goal Impact Simulation */}
      <Section title="تأثير الأهداف" icon={Target}>
        {goalPredictions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لا توجد أهداف نشطة</p>
        ) : (
          <div className="space-y-4">
            {goalPredictions.map(g => (
              <div key={g.id} className="border border-gray-100 rounded-xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-gray-800 truncate">{g.title}</h4>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    g.probability >= 70 ? 'bg-green-100 text-green-700' :
                    g.probability >= 40 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {g.probability}% احتمال
                  </span>
                </div>

                <div className="h-2.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: Math.min(g.progressPct, 100) + '%' }} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-3">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-400">المتبقي</p>
                    <p className="font-bold text-gray-700">{fmt(g.remaining)} د.ع</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-400">الإكمال المتوقع</p>
                    <p className="font-bold text-gray-700">{g.completionDate ? g.completionDate.toLocaleDateString('ar-IQ', { month: 'short', year: 'numeric' }) : '-'}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                    <p className="text-amber-600">تأخير بزيادة 15%</p>
                    <p className="font-bold text-amber-700">+{g.monthsDelay} شهر</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 text-center">
                    <p className="text-emerald-600">تحسين بزيادة 20%</p>
                    <p className="font-bold text-emerald-700">-{g.monthsSaved} شهر</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 7: AI Recommendations */}
      <Section title="التوصيات الذكية" icon={Lightbulb}>
        {recommendations.map((r, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl mb-2 last:mb-0 ${
            r.type === 'category' ? 'bg-orange-50' :
            r.type === 'savings' ? 'bg-green-50' :
            r.type === 'budgetWarning' || r.type === 'weeklyAlert' ? 'bg-red-50' :
            r.type === 'trend' ? (r.direction === 'up' ? 'bg-orange-50' : 'bg-blue-50') :
            r.type === 'goalBoost' ? 'bg-purple-50' : 'bg-gray-50'
          }`}>
            {r.type === 'category' && <TrendingDown className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
            {r.type === 'savings' && <PiggyBank className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
            {r.type === 'budgetWarning' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
            {r.type === 'weeklyAlert' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
            {r.type === 'trend' && (r.direction === 'up' ? <ArrowUp className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> : <ArrowDown className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />)}
            {r.type === 'goalBoost' && <Zap className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />}
            {r.type === 'general' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
            <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </Section>

      {/* Section 8: Risk Prediction */}
      <Section title="توقع المخاطر" icon={AlertTriangle}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg ${
            risk.level === 'منخفض' ? 'bg-emerald-500' :
            risk.level === 'متوسط' ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            {risk.score}
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: risk.color }}>مخاطر {risk.level}</p>
            <p className="text-xs text-gray-400 mt-0.5">درجة المخاطر المالية</p>
          </div>
        </div>
        {risk.reasons.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 mb-1">الأسباب:</p>
            {risk.reasons.map((reason, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {reason}
              </div>
            ))}
          </div>
        )}
        {risk.reasons.length === 0 && (
          <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">لا توجد مخاطر مالية كبيرة في الوقت الحالي.</p>
        )}
      </Section>

      {/* Section 9: Financial Health AI Score */}
      <Section title="الدرجة المالية المحسّنة" icon={Award}>
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <div className="relative">
            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={health.grade.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(health.score, 100) / 100)} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold" style={{ color: health.grade.color }}>{health.score}</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-lg font-bold" style={{ color: health.grade.color }}>{health.grade.label}</p>
            <p className="text-xs text-gray-400 mt-1">درجة مالية محسّنة بخوارزمية متعددة العوامل</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-400">نسبة الادخار</p>
            <p className="text-sm font-bold text-gray-700">{Math.round(health.breakdown.savingScore)}/{20}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-400">الميزانية</p>
            <p className="text-sm font-bold text-gray-700">{Math.round(health.breakdown.budgetScore)}/{15}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text[10px] text-gray-400">الأهداف</p>
            <p className="text-sm font-bold text-gray-700">{Math.round(health.breakdown.goalScore)}/{15}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-400">الاستقرار</p>
            <p className="text-sm font-bold text-gray-700">{Math.round(health.breakdown.stabilityScore)}/{15}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-400">طوارئ</p>
            <p className="text-sm font-bold text-gray-700">{Math.round(health.breakdown.emergencyScore)}/{15}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-400">انتظام</p>
            <p className="text-sm font-bold text-gray-700">{Math.round(health.breakdown.consistencyOfSpending)}/{10}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-400">تحسن الاتجاه</p>
            <p className="text-sm font-bold text-gray-700">{Math.round(health.breakdown.trendImprovement)}/{10}</p>
          </div>
        </div>

        {health.reasons.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1.5">الأسباب:</p>
            <div className="flex flex-wrap gap-1.5">
              {health.reasons.map((r, i) => (
                <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg">{r}</span>
              ))}
            </div>
          </div>
        )}

        {health.improvements.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">اقتراحات للتحسين:</p>
            <div className="space-y-1">
              {health.improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 rounded-lg px-3 py-1.5">
                  <Sparkles className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                  {imp}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Section 10: Architecture note (subtle) */}
      <div className="text-center py-3">
        <p className="text-[10px] text-gray-300 flex items-center justify-center gap-1.5">
          <Zap className="w-3 h-3" />
          جميع التوقعات محسوبة من بياناتك الفعلية — محرك قابل للاستبدال بنماذج AI مستقبلًا
        </p>
      </div>

    </div>
  )
}
