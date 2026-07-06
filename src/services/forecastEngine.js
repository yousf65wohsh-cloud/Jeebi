import { calcStats } from './statisticsService'

export function generateForecast(data, options = {}) {
  const stats = calcStats(data)
  const {
    mode = 'current', savingsIncrease = 0, spendingReduction = 0, incomeIncrease = 0
  } = options

  let monthlyNet = stats.monthlyNet
  if (mode === 'increaseSavings') monthlyNet -= savingsIncrease
  else if (mode === 'reduceSpending') monthlyNet += stats.monthlyAvg * (spendingReduction / 100)
  else if (mode === 'increaseIncome') monthlyNet += incomeIncrease

  const months = []
  let projBalance = stats.balance
  for (let i = 0; i < 12; i++) {
    const d = new Date(stats.now)
    d.setMonth(d.getMonth() + i + 1)
    projBalance += monthlyNet
    months.push({ month: d.toLocaleDateString('en-US', { month: 'long' }), balance: Math.round(projBalance) })
  }

  const adjSpending = mode === 'reduceSpending' ? stats.monthlyAvg * (1 - spendingReduction / 100) : stats.monthlyAvg
  const runwayMonths = adjSpending > 0 ? stats.balance / adjSpending : 999
  const wSavings = adjSpending > 0 ? (stats.balance + stats.savings) / adjSpending : 999
  const exhaustionDate = new Date(stats.now)
  exhaustionDate.setMonth(exhaustionDate.getMonth() + Math.floor(runwayMonths))
  exhaustionDate.setDate(exhaustionDate.getDate() + Math.round((runwayMonths % 1) * 30))

  return { months, monthlyNet: Math.round(monthlyNet), runwayMonths, runwayWithSavings: wSavings, exhaustionDate, stats }
}

export function calcRunway(balance, monthlyAvg) {
  if (monthlyAvg <= 0) return { months: 999, days: 999 }
  const months = balance / monthlyAvg
  return { months: Math.floor(months), days: Math.round((months % 1) * 30), totalDays: Math.round(months * 30.44) }
}

export function calcConfidence(stats) {
  const txnScore = Math.min((stats.totalTxns || 0) / 200, 1) * 30
  const historyScore = Math.min(stats.daysOfHistory / 180, 1) * 25

  const mean = stats.monthlyValues?.length > 0 ? stats.monthlyValues.reduce((s, v) => s + v, 0) / stats.monthlyValues.length : 0
  const variance = stats.monthlyValues?.length > 1 ? stats.monthlyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / stats.monthlyValues.length : 0
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1
  const consistencyScore = Math.max(0, (1 - Math.min(cv, 1)) * 25)

  const dataScore = Math.min(stats.daysOfHistory / 90, 1) * 20
  const score = Math.min(Math.round(txnScore + historyScore + consistencyScore + dataScore), 100)

  return {
    score,
    level: score >= 70 ? 'عالية' : score >= 40 ? 'متوسطة' : 'منخفضة',
    color: score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  }
}

export function calcHealthScore(stats, categories, goals) {
  const savingRatio = stats.balance > 0 ? Math.min((stats.balance + stats.savings - stats.totalExpenses) / stats.balance, 1) : 0
  const savingScore = Math.max(0, savingRatio * 20)

  const catBudget = categories.filter(c => (c.budget || 0) > 0)
  const budgetScore = catBudget.length > 0
    ? (catBudget.filter(c => {
        const spent = Object.entries(stats.catSpending || {}).find(([n]) => n === c.name)?.[1]?.amount || 0
        return spent <= (c.budget || 0) * 1.1
      }).length / catBudget.length) * 15
    : 15

  const active = (goals || []).filter(g => !g.completed)
  const goalScore = active.length > 0
    ? (active.reduce((s, g) => s + Math.min((g.saved_amount || 0) / Math.max(g.target_amount, 1), 1), 0) / active.length) * 15
    : 15

  const monthStd = stats.monthlyValues.length > 1
    ? Math.sqrt(stats.monthlyValues.reduce((s, v) => s + (v - stats.monthlyAvg) ** 2, 0) / stats.monthlyValues.length)
    : 0
  const cv = stats.monthlyAvg > 0 ? monthStd / stats.monthlyAvg : 1
  const stabilityScore = Math.max(0, (1 - Math.min(cv, 1)) * 15)

  const emergencyFundMonths = stats.monthlyAvg > 0 ? stats.savings / stats.monthlyAvg : 0
  const emergencyScore = Math.min(emergencyFundMonths / 6, 1) * 15

  const recent = stats.monthlyValues.slice(-3)
  const consistPast = stats.monthlyValues.slice(0, 3)
  const consistencyOfSpending = stats.monthlyValues.length > 2 && stats.monthlyAvg > 0
    ? Math.max(0, 1 - Math.min(
        recent.reduce((s, v) => s + Math.abs(v - stats.monthlyAvg), 0) / (stats.monthlyAvg * Math.max(recent.length, 1)), 1
      )) * 10
    : 10

  const trendImprovement = stats.trend <= 0 ? 10 : Math.max(0, 10 - stats.trend / 10)

  const score = Math.round(Math.min(savingScore + budgetScore + goalScore + stabilityScore + emergencyScore + consistencyOfSpending + trendImprovement, 100))

  const getGrade = (s) =>
    s >= 85 ? { label: 'ممتاز', color: '#10b981' } :
    s >= 70 ? { label: 'جيد جدًا', color: '#3b82f6' } :
    s >= 55 ? { label: 'جيد', color: '#f59e0b' } :
    s >= 40 ? { label: 'متوسط', color: '#f97316' } :
    { label: 'حرج', color: '#ef4444' }

  const reasons = []
  if (savingScore < 10) reasons.push('نسبة الادخار منخفضة')
  if (budgetScore < 8) reasons.push('تجاوز الميزانية')
  if (goalScore < 8) reasons.push('تقدم الأهداف بطيء')
  if (stabilityScore < 8) reasons.push('تقلبات في الإنفاق')
  if (emergencyScore < 8) reasons.push('صندوق طوارئ غير كافٍ')

  const improvements = []
  if (savingScore < 15) improvements.push('زد نسبة الادخار إلى 20% من رصيدك')
  if (budgetScore < 10) improvements.push('ضع ميزانية للفئات الأكثر إنفاقًا')
  if (goalScore < 10) improvements.push('زد التحويل الشهري لأهدافك')
  if (emergencyScore < 10) improvements.push('اجمع مدخرات طوارئ تكفي 3-6 أشهر')

  return {
    score, grade: getGrade(score), reasons, improvements,
    breakdown: { savingScore, budgetScore, goalScore, stabilityScore, emergencyScore, consistencyOfSpending, trendImprovement }
  }
}

export function calcRisk(healthScore, runwayMonths, stats) {
  let score = 0; const reasons = []
  if (healthScore >= 70) score += 25; else if (healthScore >= 40) score += 15; else { score += 5; reasons.push('الدرجة المالية منخفضة') }
  if (runwayMonths >= 12) score += 25; else if (runwayMonths >= 6) score += 18; else if (runwayMonths >= 3) score += 10; else { score += 5; reasons.push('الرصيد يتناقص بسرعة') }
  const multiple = stats.monthlyAvg > 0 ? stats.savings / stats.monthlyAvg : 0
  if (multiple >= 3) score += 25; else if (multiple >= 1) score += 15; else if (multiple > 0) score += 10; else { score += 5; reasons.push('المدخرات غير كافية') }
  if (stats.trend <= 10) score += 25; else if (stats.trend <= 20) score += 15; else { score += 10; reasons.push('المصاريف في ارتفاع') }

  return {
    score: Math.min(score, 100),
    level: score >= 70 ? 'منخفض' : score >= 40 ? 'متوسط' : 'مرتفع',
    color: score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444',
    reasons
  }
}

export function calcMilestones(forecast) {
  const { months, stats, runwayMonths, exhaustionDate } = forecast
  const ms = [{ label: 'اليوم', amount: stats.balance, date: new Date(stats.now), isExhaustion: false }]
  for (let i = 0; i < Math.min(months.length, 3); i++) {
    const d = new Date(stats.now); d.setMonth(d.getMonth() + i + 1)
    ms.push({ label: `بعد ${(i + 1) * 30} يوم`, amount: months[i].balance, date: d, isExhaustion: false })
  }
  const msLeft = (exhaustionDate - stats.now) / (86400000 * 30.44)
  if (msLeft < 12 && msLeft > 0) {
    ms.push({ label: 'نفاد الرصيد المتوقع', amount: 0, date: exhaustionDate, isExhaustion: true })
  }
  return ms
}

export function generateSummary(stats, forecast, suggestions, goalPredictions, mode) {
  const parts = []
  const runway = Math.floor(forecast.runwayMonths)
  parts.push(`بناءً على نشاطك المالي خلال آخر ${Math.round(stats.daysOfHistory)} يومًا، من المتوقع أن يستمر رصيدك لمدة ${runway} أشهر تقريبًا.`)

  const last = forecast.months[forecast.months.length - 1]
  if (last) parts.push(`إذا استمر نمط إنفاقك الحالي، قد يصل رصيدك إلى ${(last.balance ?? 0).toLocaleString('en-US')} د.ع بحلول ${last.month}.`)

  return parts.join(' ')
}
