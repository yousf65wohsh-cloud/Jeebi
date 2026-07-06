import { calcStats } from './statisticsService'

export function generateForecast(data, options = {}) {
  const stats = calcStats(data)
  const {
    mode = 'current',
    savingsIncrease = 0,
    spendingReduction = 0,
    incomeIncrease = 0
  } = options

  let monthlyNet = stats.monthlyNet

  if (mode === 'increaseSavings') {
    monthlyNet -= savingsIncrease
  } else if (mode === 'reduceSpending') {
    const reduction = stats.monthlyAvg * (spendingReduction / 100)
    monthlyNet += reduction
  } else if (mode === 'increaseIncome') {
    monthlyNet += incomeIncrease
  }

  const months = []
  let projectedBalance = stats.balance
  let projectedSavings = stats.savings

  for (let i = 0; i < 12; i++) {
    const d = new Date(stats.now)
    d.setMonth(d.getMonth() + i + 1)
    const monthLabel = d.toLocaleDateString('en-US', { month: 'long' })

    projectedBalance += monthlyNet

    if (mode === 'increaseSavings') {
      projectedSavings += savingsIncrease
    }

    months.push({
      month: monthLabel,
      balance: Math.round(projectedBalance),
      savings: Math.round(projectedSavings)
    })
  }

  const monthlyAvgSpending = stats.monthlyAvg
  const adjustedSpending = mode === 'reduceSpending'
    ? monthlyAvgSpending * (1 - spendingReduction / 100)
    : monthlyAvgSpending

  const runwayMonths = adjustedSpending > 0 ? stats.balance / adjustedSpending : 999
  const runwayWithSavings = adjustedSpending > 0 ? (stats.balance + stats.savings) / adjustedSpending : 999

  const exhaustionDate = new Date(stats.now)
  exhaustionDate.setMonth(exhaustionDate.getMonth() + Math.floor(runwayMonths))
  exhaustionDate.setDate(exhaustionDate.getDate() + Math.round((runwayMonths % 1) * 30))

  return {
    months,
    monthlyNet: Math.round(monthlyNet),
    runwayMonths: Math.round(runwayMonths * 10) / 10,
    runwayWithSavings: Math.round(runwayWithSavings * 10) / 10,
    exhaustionDate,
    stats
  }
}

export function calcConfidence(stats) {
  const txnScore = Math.min((stats.expenseTxns?.length || 0) / 200, 1) * 30
  const historyScore = Math.min(stats.daysOfHistory / 180, 1) * 25

  const mean = stats.monthlyValues?.length > 0
    ? stats.monthlyValues.reduce((s, v) => s + v, 0) / stats.monthlyValues.length : 0
  const variance = stats.monthlyValues?.length > 1
    ? stats.monthlyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / stats.monthlyValues.length : 0
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1
  const consistencyScore = Math.max(0, (1 - Math.min(cv, 1)) * 25)

  const dataScore = Math.min(stats.daysOfHistory / 90, 1) * 20

  const score = Math.min(Math.round(txnScore + historyScore + consistencyScore + dataScore), 100)

  let level, color
  if (score >= 70) { level = 'عالية'; color = '#10b981' }
  else if (score >= 40) { level = 'متوسطة'; color = '#f59e0b' }
  else { level = 'منخفضة'; color = '#ef4444' }

  return { score, level, color }
}

export function calcMilestones(forecast) {
  const { months, stats } = forecast
  const milestones = [
    { label: 'اليوم', amount: stats.balance, date: new Date(stats.now), isExhaustion: false }
  ]

  for (let i = 0; i < Math.min(months.length, 3); i++) {
    const m = months[i]
    const date = new Date(stats.now)
    date.setMonth(date.getMonth() + i + 1)
    milestones.push({
      label: `بعد ${(i + 1) * 30} يوم`,
      amount: m.balance,
      date,
      isExhaustion: false
    })
  }

  const exhaustion = forecast.exhaustionDate
  const now = new Date(stats.now)
  const msLeft = exhaustion - now
  const monthsLeft = msLeft / (1000 * 60 * 60 * 24 * 30.44)

  if (monthsLeft < 12 && monthsLeft > 0) {
    milestones.push({
      label: 'نفاد الرصيد المتوقع',
      amount: 0,
      date: exhaustion,
      isExhaustion: true
    })
  }

  return milestones
}

export function calcRisk(healthScore, runwayMonths, stats) {
  let score = 0
  const reasons = []

  if (healthScore >= 70) score += 25
  else if (healthScore >= 40) score += 15
  else { score += 5; reasons.push('الدرجة المالية منخفضة') }

  if (runwayMonths >= 12) score += 25
  else if (runwayMonths >= 6) score += 18
  else if (runwayMonths >= 3) score += 10
  else { score += 5; reasons.push('الرصيد يتناقص بسرعة') }

  const monthlyExpenseMultiple = stats.monthlyAvg > 0 ? stats.savings / stats.monthlyAvg : 0
  if (monthlyExpenseMultiple >= 3) score += 25
  else if (monthlyExpenseMultiple >= 1) score += 15
  else if (monthlyExpenseMultiple > 0) score += 10
  else { score += 5; reasons.push('المدخرات غير كافية') }

  if (stats.trend <= 10) score += 25
  else if (stats.trend <= 20) score += 15
  else { score += 10; reasons.push('المصاريف في ارتفاع مستمر') }

  let level, color
  if (score >= 70) { level = 'منخفض'; color = '#10b981' }
  else if (score >= 40) { level = 'متوسط'; color = '#f59e0b' }
  else { level = 'مرتفع'; color = '#ef4444' }

  return { score: Math.min(score, 100), level, color, reasons }
}

export function calcHealthScore(stats, categories, goals) {
  const savingRatio = stats.balance > 0
    ? Math.min((stats.balance + stats.savings - stats.totalExpenses) / stats.balance, 1)
    : 0
  const savingScore = Math.max(0, savingRatio * 20)

  const catBudget = categories.filter(c => (c.budget || 0) > 0)
  const budgetScore = catBudget.length > 0
    ? (catBudget.filter(c => {
        const spent = Object.entries(stats.catSpending || {})
          .find(([n]) => n === c.name)?.[1]?.amount || 0
        return spent <= (c.budget || 0) * 1.1
      }).length / catBudget.length) * 15
    : 15

  const activeGoals = (goals || []).filter(g => !g.completed)
  const goalScore = activeGoals.length > 0
    ? (activeGoals.reduce((s, g) => {
        const pct = g.target_amount > 0 ? ((g.saved_amount || 0) / g.target_amount) : 0
        return s + Math.min(pct, 1)
      }, 0) / activeGoals.length) * 15
    : 15

  const monthStd = stats.monthlyValues.length > 1
    ? Math.sqrt(stats.monthlyValues.reduce((s, v) => s + (v - stats.monthlyAvg) ** 2, 0) / stats.monthlyValues.length)
    : 0
  const cv = stats.monthlyAvg > 0 ? monthStd / stats.monthlyAvg : 1
  const stabilityScore = Math.max(0, (1 - Math.min(cv, 1)) * 15)

  const emergencyFundMonths = stats.monthlyAvg > 0 ? stats.savings / stats.monthlyAvg : 0
  const emergencyScore = Math.min(emergencyFundMonths / 6, 1) * 15

  const consistencyOfSpending = stats.monthlyValues.length > 1
    ? Math.max(0, 1 - Math.min(
        stats.monthlyValues.slice(-3).reduce((s, v) => s + Math.abs(v - stats.monthlyAvg), 0) /
        (stats.monthlyAvg * 3 || 1), 1
      )) * 10
    : 10

  const trendImprovement = stats.trend <= 0 ? 10 : Math.max(0, 10 - stats.trend / 10)

  const score = Math.round(Math.min(
    savingScore + budgetScore + goalScore + stabilityScore + emergencyScore +
    consistencyOfSpending + trendImprovement, 100
  ))

  const getGrade = (s) =>
    s >= 85 ? { label: 'ممتاز', color: '#10b981' } :
    s >= 70 ? { label: 'جيد جدًا', color: '#3b82f6' } :
    s >= 55 ? { label: 'جيد', color: '#f59e0b' } :
    s >= 40 ? { label: 'متوسط', color: '#f97316' } :
    { label: 'حرج', color: '#ef4444' }

  const grade = getGrade(score)

  const reasons = []
  if (savingScore < 10) reasons.push('نسبة الادخار منخفضة')
  if (budgetScore < 8) reasons.push('تجاوز الميزانية في بعض الفئات')
  if (goalScore < 8) reasons.push('تقدم الأهداف بطيء')
  if (stabilityScore < 8) reasons.push('تقلبات عالية في الإنفاق')
  if (emergencyScore < 8) reasons.push('صندوق الطوارئ غير كافٍ')

  const improvements = []
  if (savingScore < 15) improvements.push('حاول زيادة نسبة الادخار إلى 20% من رصيدك')
  if (budgetScore < 10) improvements.push('ضع ميزانية للفئات التي تتجاوز إنفاقها')
  if (goalScore < 10) improvements.push('زد المبلغ المحول شهريًا لأهدافك')
  if (emergencyScore < 10) improvements.push('اجمع مدخرات طوارئ تكفي 3-6 أشهر')

  return { score, grade, reasons, improvements, breakdown: { savingScore, budgetScore, goalScore, stabilityScore, emergencyScore, consistencyOfSpending, trendImprovement } }
}
