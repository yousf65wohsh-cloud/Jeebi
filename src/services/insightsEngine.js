export function calculateInsights(data, adjustments = {}) {
  const { transactions = [], categories = [], balance = 0, savings = 0, goals = [] } = data
  const adj = { reducePct: 0, addSavings: 0, addBalance: 0, extraIncome: 0, ...adjustments }
  const adjBalance = balance + adj.addBalance + adj.extraIncome
  const adjSavings = savings + adj.addSavings

  const now = Date.now()
  const totalExp = transactions.reduce((s, t) => s + (t.amount ?? 0), 0)
  let avgDaily = 0, avgMonthly = 0, daysSpan = 1
  if (transactions.length > 0) {
    const dates = transactions.map(t => new Date(t.date).getTime()).filter(d => !isNaN(d))
    if (dates.length > 0) {
      daysSpan = Math.max(1, Math.ceil((now - Math.min(...dates)) / 86400000))
      avgDaily = totalExp / daysSpan
      avgMonthly = avgDaily * 30
    }
  }

  const reducedAvgDaily = avgDaily * (1 - adj.reducePct / 100)
  const effectiveAvgDaily = Math.max(reducedAvgDaily, 0.001)
  const effectiveAvgMonthly = effectiveAvgDaily * 30

  const monthlyByCat = {}
  transactions.forEach(t => {
    if (!t.date || !t.amount) return
    const key = t.date.slice(0, 7)
    if (!monthlyByCat[key]) monthlyByCat[key] = {}
    const catId = t.categoryId || 'unknown'
    if (!monthlyByCat[key][catId]) monthlyByCat[key][catId] = 0
    monthlyByCat[key][catId] += t.amount
  })
  const months = Object.keys(monthlyByCat).sort()
  const monthCount = months.length || 1

  const monthlyTotals = months.map(m => Object.values(monthlyByCat[m]).reduce((s, v) => s + v, 0))
  const avgMonthlyTotal = monthlyTotals.length > 0 ? monthlyTotals.reduce((s, v) => s + v, 0) / monthlyTotals.length : 0
  const monthStd = monthlyTotals.length > 0 ? Math.sqrt(monthlyTotals.reduce((s, v) => s + (v - avgMonthlyTotal) ** 2, 0) / monthlyTotals.length) : 0
  const consistency = avgMonthlyTotal > 0 ? 1 - Math.min(monthStd / avgMonthlyTotal, 1) : 1

  const spentByCat = {}
  transactions.forEach(t => {
    if (!t.amount) return
    const id = t.categoryId || 'unknown'
    spentByCat[id] = (spentByCat[id] || 0) + t.amount
  })

  let budgetOverruns = 0, totalCats = 0
  categories.forEach(c => {
    if ((c.budget ?? 0) > 0) {
      totalCats++
      const spent = spentByCat[c.id] || 0
      if (spent > c.budget) budgetOverruns++
    }
  })
  const budgetScore = totalCats > 0 ? (1 - budgetOverruns / totalCats) * 20 : 20

  const savingRatio = adjBalance > 0 ? Math.min(Math.max((adjBalance - totalExp) / adjBalance, 0), 1) : 0
  const savingScore = savingRatio * 30

  const consistencyScore = consistency * 20

  const emergencyMonths = effectiveAvgMonthly > 0 ? adjSavings / effectiveAvgMonthly : 0
  const emergencyScore = Math.min(emergencyMonths / 6, 1) * 15

  const activeGoals = goals.filter(g => g.status === 'active')
  let goalScore = 0
  if (activeGoals.length > 0) {
    const onTrack = activeGoals.filter(g => (g.saved_amount ?? 0) > 0).length
    goalScore = (onTrack / activeGoals.length) * 15
  }

  const healthScore = Math.round(Math.min(savingScore + consistencyScore + budgetScore + emergencyScore + goalScore, 100))

  const getGrade = (s) => s >= 80 ? { label: 'ممتاز', color: '#10b981' } : s >= 60 ? { label: 'جيد', color: '#3b82f6' } : s >= 40 ? { label: 'متوسط', color: '#f59e0b' } : s >= 20 ? { label: 'محفوف بالمخاطر', color: '#f97316' } : { label: 'حرج', color: '#ef4444' }

  const grade = getGrade(healthScore)

  const runwayDays = effectiveAvgDaily > 0 ? Math.floor(adjBalance / effectiveAvgDaily) : 0
  const runwayWithSavings = effectiveAvgDaily > 0 ? Math.floor((adjBalance + adjSavings) / effectiveAvgDaily) : 0

  const projectBalance = adjBalance - effectiveAvgMonthly * 12
  const projectSavings = adjSavings
  const projectExpenses = effectiveAvgMonthly * 12
  const projectMonthlyAvg = effectiveAvgMonthly

  const catSpending = categories.map(c => ({
    ...c,
    spent: spentByCat[c.id] || 0,
    pct: totalExp > 0 ? ((spentByCat[c.id] || 0) / totalExp) * 100 : 0,
  })).sort((a, b) => b.spent - a.spent)

  const suggestions = []
  const topCat = catSpending[0]
  if (topCat && topCat.pct > 15) {
    const reduction = topCat.spent * 0.15
    const yearly = reduction * 12
    suggestions.push({ type: 'category', title: topCat.name, pct: topCat.pct, yearly, monthly: reduction })
  }
  const effectiveSavings = adjBalance > 0 ? ((adjBalance - totalExp) / adjBalance) * 100 : 0
  if (effectiveSavings < 15) {
    const target = 15
    const extraMonthly = (adjBalance * target / 100) - (adjBalance - totalExp)
    suggestions.push({ type: 'savings', current: effectiveSavings, target, extraMonthly })
  }
  if (catSpending.length > 1) {
    const prevMonths = months.slice(0, Math.max(1, Math.floor(months.length / 2)))
    const recentMonths = months.slice(Math.floor(months.length / 2))
    const getAvgFor = (ms) => {
      const cats = {}
      ms.forEach(m => { Object.entries(monthlyByCat[m] || {}).forEach(([cid, v]) => { cats[cid] = (cats[cid] || 0) + v }) })
      return cats
    }
    const prevAvg = getAvgFor(prevMonths)
    const recentAvg = getAvgFor(recentMonths)
    categories.forEach(c => {
      const prev = (prevAvg[c.id] || 0) / (prevMonths.length || 1)
      const recent = (recentAvg[c.id] || 0) / (recentMonths.length || 1)
      if (prev > 0) {
        const change = ((recent - prev) / prev) * 100
        if (Math.abs(change) > 15) {
          suggestions.push({ type: 'trend', title: c.name, direction: change > 0 ? 'up' : 'down', pct: Math.round(Math.abs(change)) })
        }
      }
    })
  }
  const thisWeekSpending = transactions.filter(t => {
    const d = new Date(t.date)
    const diff = (now - d.getTime()) / 86400000
    return diff >= 0 && diff <= 7 && t.amount
  }).reduce((s, t) => s + t.amount, 0)
  if (thisWeekSpending > avgMonthlyTotal && avgMonthlyTotal > 0) {
    suggestions.push({ type: 'weeklyAlert', weekTotal: thisWeekSpending, monthlyAvg: avgMonthlyTotal })
  }

  const goalPredictions = activeGoals.map(g => {
    const remaining = (g.target_amount ?? 0) - (g.saved_amount ?? 0)
    const rate = g.transfer_amount ?? 0
    const monthsRemaining = rate > 0 ? remaining / rate : 999
    const daysRemaining = monthsRemaining * 30
    const progressPct = g.target_amount > 0 ? ((g.saved_amount ?? 0) / g.target_amount) * 100 : 0
    const achievedBy = new Date(now + daysRemaining * 86400000)
    const probability = rate > 0 && monthsRemaining < 60 ? Math.round(Math.min(Math.max(100 - (monthsRemaining / 60) * 100 + progressPct * 0.3, 5), 98)) : 5
    return { ...g, remaining, monthsRemaining: Math.ceil(monthsRemaining), daysRemaining: Math.round(daysRemaining), weeksRemaining: Math.round(daysRemaining / 7), progressPct, achievedBy, probability }
  })

  const budgetRisks = categories.map(c => {
    const spent = spentByCat[c.id] || 0
    const budget = c.budget || 0
    const pct = budget > 0 ? (spent / budget) * 100 : 0
    return { ...c, spent, budget, pct, status: pct > 100 ? 'exceeded' : pct >= 75 ? 'warning' : budget === 0 ? 'unset' : 'ok' }
  })

  const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  let mostActiveDay = '', maxDayCount = 0
  const dayCounts = {}
  transactions.forEach(t => {
    if (!t.date) return
    const day = new Date(t.date).getDay()
    dayCounts[day] = (dayCounts[day] || 0) + (t.amount ?? 0)
  })
  Object.entries(dayCounts).forEach(([d, v]) => {
    if (v > maxDayCount) { maxDayCount = v; mostActiveDay = weekDays[parseInt(d)] }
  })

  const lastWeek = transactions.filter(t => {
    const d = new Date(t.date); const diff = (now - d.getTime()) / 86400000; return diff >= 7 && diff <= 14 && t.amount
  }).reduce((s, t) => s + t.amount, 0)
  const prevWeek = transactions.filter(t => {
    const d = new Date(t.date); const diff = (now - d.getTime()) / 86400000; return diff >= 14 && diff <= 21 && t.amount
  }).reduce((s, t) => s + t.amount, 0)
  const weekChange = prevWeek > 0 ? ((lastWeek - prevWeek) / prevWeek) * 100 : 0

  const thisMonthTotal = monthlyTotals[monthlyTotals.length - 1] || 0
  const prevMonthTotal = monthlyTotals.length > 1 ? monthlyTotals[monthlyTotals.length - 2] : 0
  const monthChange = prevMonthTotal > 0 ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0

  const largestTxn = transactions.reduce((max, t) => (!max || (t.amount ?? 0) > max.amount) ? t : max, null)
  const fastestCat = catSpending.slice().sort((a, b) => b.pct - a.pct).slice(0, 3)

  const achievements = (() => {
    const earned = []
    try { const stored = localStorage.getItem('jeebi_achievements_v2'); if (stored) earned.push(...JSON.parse(stored)) } catch {}
    const check = (id, label, icon, condition) => {
      if (!earned.find(a => a.id === id) && condition()) {
        earned.push({ id, label, icon, earnedAt: new Date().toISOString() })
        try { localStorage.setItem('jeebi_achievements_v2', JSON.stringify(earned.filter(a => !a._tmp))) } catch {}
      }
      return earned
    }
    check('first_goal', 'حققت أول هدف لك', '🎯', () => goals.some(g => g.status === 'completed'))
    check('saved_million', 'وفرت 1,000,000 د.ع', '💰', () => savings >= 1000000)
    check('budget_month', 'التزمت بالميزانية شهر كامل', '📊', () => budgetRisks.filter(r => r.budget > 0 && r.status === 'ok').length >= 3)
    check('fifty_txns', 'أكملت 50 معاملة', '📝', () => transactions.length >= 50)
    check('seven_days', '7 أيام بدون تجاوز', '✅', () => false)
    check('no_debt', 'رصيدك موجب لمدة شهر', '💚', () => balance > 0 && transactions.length > 10)
    return earned
  })()

  const summary = (() => {
    const parts = []
    if (grade.label === 'ممتاز' || grade.label === 'جيد') {
      parts.push('بناءً على نشاطك المالي، وضعك المالي صحي ومستقر.')
    } else if (grade.label === 'متوسط') {
      parts.push('بناءً على نشاطك المالي، وضعك المالي يحتاج إلى بعض التحسين.')
    } else {
      parts.push('بناءً على نشاطك المالي، وضعك المالي يحتاج إلى مراجعة عاجلة.')
    }

    const rMonths = Math.floor(runwayDays / 30)
    const rDays = runwayDays % 30
    if (runwayDays > 0) {
      if (rMonths > 0) parts.push(`بمعدل إنفاقك الحالي، من المتوقع أن يستمر رصيدك لمدة ${rMonths} شهرًا و ${rDays} يومًا تقريبًا.`)
      else parts.push(`بمعدل إنفاقك الحالي، من المتوقع أن يستمر رصيدك لمدة ${rDays} يومًا تقريبًا.`)
    }

    const savingsRate = Math.round(effectiveSavings)
    if (savingsRate > 0) parts.push(`توفر حوالي ${savingsRate}% من أموالك المتاحة.`)

    if (topCat && topCat.pct > 15) {
      const y = Math.round(topCat.spent * 0.15 * 12 / 1000) * 1000
      parts.push(`تخفيض مصاريف ${topCat.title} بنسبة 10% قد يوفر لك حوالي ${y.toLocaleString('en-US')} د.ع سنويًا.`)
    }

    const nearestGoal = goalPredictions.sort((a, b) => a.monthsRemaining - b.monthsRemaining)[0]
    if (nearestGoal && nearestGoal.monthsRemaining < 60) {
      parts.push(`إذا استمرت خطتك الحالية، من المتوقع إكمال هدف "${nearestGoal.title}" خلال ${nearestGoal.monthsRemaining} شهرًا.`)
    }
    return parts.join(' ')
  })()

  return {
    healthScore, grade,
    runway: { days: runwayDays, months: Math.floor(runwayDays / 30), remainderDays: runwayDays % 30, withSavings: runwayWithSavings },
    forecast: { balance: Math.round(projectBalance), savings: Math.round(projectSavings), expenses: Math.round(projectExpenses), monthlyAvg: Math.round(projectMonthlyAvg) },
    suggestions, goalPredictions, budgetRisks,
    trends: { weekChange: Math.round(weekChange), monthChange: Math.round(monthChange), largestTxn: largestTxn ? { amount: largestTxn.amount, desc: largestTxn.description || '' } : null, mostActiveDay, topCategories: fastestCat, thisWeekTotal: thisWeekSpending, lastWeekTotal: lastWeek, thisMonthTotal, prevMonthTotal },
    achievements,
    summary,
    catSpending,
  }
}
