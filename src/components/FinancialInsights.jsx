import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { calcStats } from '../services/statisticsService'
import { generateForecast, calcConfidence, calcHealthScore, calcRisk, calcMilestones, generateSummary } from '../services/forecastEngine'
import { generateRecommendations } from '../services/recommendationService'
import { predictGoals } from '../services/predictionService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Brain, TrendingUp, PiggyBank, TrendingDown, ShieldCheck, Target, AlertTriangle, Award, Lightbulb, Clock, Sliders, BarChart3 } from 'lucide-react'

function fmt(n) { return Math.round(n ?? 0).toLocaleString('en-US') }

function GlassCard({ children, className = '' }) {
  return <div className={`bg-white/80 backdrop-blur-sm border border-white/50 shadow-sm rounded-2xl p-4 md:p-5 ${className}`}>{children}</div>
}

function ModeBtn({ active, onClick, label }) {
  return <button onClick={onClick} className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap ${active ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
}

export default function FinancialInsights() {
  const { transactions = [], categories = [], balance = 0, savings = 0, goals = [] } = useApp()
  const [mode, setMode] = useState('current')
  const [savingsInc, setSavingsInc] = useState(50000)
  const [spendingRed, setSpendingRed] = useState(10)
  const [incomeInc, setIncomeInc] = useState(100000)

  const rawData = useMemo(() => ({ transactions, categories, balance, savings, goals }), [transactions, categories, balance, savings, goals])
  const stats = useMemo(() => calcStats(rawData), [rawData])

  const options = useMemo(() => ({ mode, ...(mode === 'increaseSavings' ? { savingsIncrease: savingsInc } : {}), ...(mode === 'reduceSpending' ? { spendingReduction: spendingRed } : {}), ...(mode === 'increaseIncome' ? { incomeIncrease: incomeInc } : {}) }), [mode, savingsInc, spendingRed, incomeInc])

  const forecast = useMemo(() => generateForecast(rawData, options), [rawData, options])
  const confidence = useMemo(() => calcConfidence(stats), [stats])
  const health = useMemo(() => calcHealthScore(stats, categories, goals), [stats, categories, goals])
  const risk = useMemo(() => calcRisk(health.score, forecast.runwayMonths, stats), [health.score, forecast.runwayMonths, stats])
  const milestones = useMemo(() => calcMilestones(forecast), [forecast])
  const goalP = useMemo(() => predictGoals(goals, stats, forecast.monthlyNet), [goals, stats, forecast.monthlyNet])
  const recs = useMemo(() => generateRecommendations(stats, stats.catSpending, goals), [stats, goals])

  const summaryText = useMemo(() => generateSummary(stats, forecast, recs, goalP, mode), [stats, forecast, recs, goalP, mode])

  const chartData = forecast.months.map((m, i) => ({ month: i === 0 ? 'هذا الشهر' : m.month.slice(0, 3), balance: m.balance }))

  return (
    <div className="space-y-4">
      <GlassCard className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border-indigo-100/50">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 leading-relaxed">{summaryText}</p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="text-center py-5">
          <div className="relative w-20 h-20 mx-auto mb-2">
            <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={health.grade.color} strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(health.score, 100) / 100)} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold" style={{ color: health.grade.color }}>{health.score}</span>
            </div>
          </div>
          <p className="text-sm font-bold" style={{ color: health.grade.color }}>{health.grade.label}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">الدرجة المالية</p>
          {health.reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              {health.reasons.slice(0, 2).map((r, i) => <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{r}</span>)}
            </div>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col justify-center">
          <p className="text-xs text-gray-500 mb-1">مدة كفاية الرصيد</p>
          <p className="text-xl font-bold text-gray-800">{Math.floor(forecast.runwayMonths)} شهرًا</p>
          <p className="text-xs text-gray-500">{Math.round((forecast.runwayMonths % 1) * 30)} يومًا</p>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">مع المدخرات: <span className="font-medium text-emerald-600">{Math.floor(forecast.runwayWithSavings)} شهرًا</span></p>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-800">التوقعات المالية</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <ModeBtn active={mode === 'current'} onClick={() => setMode('current')} label="الإنفاق الحالي" />
          <ModeBtn active={mode === 'increaseSavings'} onClick={() => setMode('increaseSavings')} label="زيادة الادخار" />
          <ModeBtn active={mode === 'reduceSpending'} onClick={() => setMode('reduceSpending')} label="تخفيض المصاريف" />
          <ModeBtn active={mode === 'increaseIncome'} onClick={() => setMode('increaseIncome')} label="زيادة الدخل" />
        </div>
        {mode === 'increaseSavings' && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-3">
            <PiggyBank className="w-4 h-4 text-amber-500 shrink-0" />
            <input type="number" value={savingsInc} onChange={e => setSavingsInc(Number(e.target.value) || 0)} className="w-full bg-transparent text-sm outline-none text-gray-700" />
            <span className="text-xs text-gray-400 shrink-0">د.ع/شهر</span>
          </div>
        )}
        {mode === 'reduceSpending' && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {[5, 10, 15, 20, 25].map(p => (
              <button key={p} onClick={() => setSpendingRed(p)} className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-all ${spendingRed === p ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}%</button>
            ))}
          </div>
        )}
        {mode === 'increaseIncome' && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
            <input type="number" value={incomeInc} onChange={e => setIncomeInc(Number(e.target.value) || 0)} className="w-full bg-transparent text-sm outline-none text-gray-700" />
            <span className="text-xs text-gray-400 shrink-0">د.ع/شهر</span>
          </div>
        )}
        <div className="bg-gray-50/50 rounded-xl p-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(v >= 1000000 ? 1 : 0) + 'م'} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} formatter={v => [fmt(v) + ' د.ع', 'الرصيد']} />
              <Line type="monotone" dataKey="balance" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3, fill: '#7C3AED' }} activeDot={{ r: 5, fill: '#7C3AED' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
          <span>الثقة: {confidence.score}% — {confidence.level}</span>
          <span>المخاطر: {risk.level}</span>
        </div>
      </GlassCard>

      {recs.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">توصيات</h3>
          </div>
          <div className="space-y-2">
            {recs.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl text-sm ${
                r.type === 'category' ? 'bg-orange-50' :
                r.type === 'savings' ? 'bg-green-50' :
                r.type === 'alert' ? 'bg-red-50' :
                r.type === 'trend' && r.direction === 'up' ? 'bg-orange-50' :
                r.type === 'goalBoost' ? 'bg-purple-50' : 'bg-gray-50'
              }`}>
                <p className="text-gray-700 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {goalP.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-gray-800">الأهداف</h3>
          </div>
          <div className="space-y-3">
            {goalP.slice(0, 3).map(g => (
              <div key={g.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-800 truncate">{g.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.probability >= 70 ? 'bg-green-100 text-green-700' : g.probability >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{g.probability}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-1 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: Math.min(g.progressPct, 100) + '%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{g.monthsRemaining} أشهر</span>
                  <span>{g.progressPct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-800">الرصيد المتوقع</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {milestones.map((m, i) => (
            <div key={i} className={`rounded-xl p-2.5 text-center ${m.isExhaustion ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
              <p className="text-[10px] text-gray-500 mb-0.5">{m.label}</p>
              <p className={`text-sm font-bold ${m.isExhaustion ? 'text-red-600' : 'text-gray-800'}`}>{fmt(m.amount)}</p>
              <p className="text-[9px] text-gray-400">{m.date.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' })}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
