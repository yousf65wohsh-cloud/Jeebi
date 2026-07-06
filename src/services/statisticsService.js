function rollingSum(txns, windowDays, now, offsetDays = 0) {
  const cutoff = now.getTime() - (offsetDays + windowDays) * 86400000
  const start = now.getTime() - offsetDays * 86400000
  return txns
    .filter(t => { const ts = new Date(t.date).getTime(); return ts >= cutoff && ts < start })
    .reduce((s, t) => s + Math.abs(t.amount), 0)
}

function detectOutliers(values) {
  if (values.length < 4) return []
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr)
}

export function calcStats({ transactions = [], categories = [], balance = 0, savings = 0 }) {
  const now = new Date()
  const expenseTxns = transactions.filter(t => (t.amount || 0) < 0)
  const incomeTxns = transactions.filter(t => (t.amount || 0) > 0)

  const totalExpenses = expenseTxns.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = incomeTxns.reduce((s, t) => s + t.amount, 0)

  const dates = transactions.map(t => new Date(t.date).getTime()).filter(d => !isNaN(d))
  const daysOfHistory = dates.length > 0 ? Math.max(1, (now.getTime() - Math.min(...dates)) / 86400000) : 1

  const rolling30 = rollingSum(expenseTxns, 30, now) / 30
  const rolling90 = rollingSum(expenseTxns, 90, now) / 90

  const thisMonth = rollingSum(expenseTxns, 30, now)
  const prevMonth = rollingSum(expenseTxns, 30, now, 30)
  const trend = prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : 0

  const monthlyMap = {}
  expenseTxns.forEach(t => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = (monthlyMap[key] || 0) + Math.abs(t.amount)
  })
  const monthlyValues = Object.values(monthlyMap)

  const todayStr = now.toISOString().slice(0, 10)
  const todaySpending = expenseTxns
    .filter(t => t.date?.slice(0, 10) === todayStr)
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const catSpending = {}
  expenseTxns.forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId)
    const name = cat?.name || 'أخرى'
    if (!catSpending[name]) catSpending[name] = { amount: 0, budget: cat?.budget || 0, color: cat?.color || '#9ca3af' }
    catSpending[name].amount += Math.abs(t.amount)
  })

  const monthlyIncome = totalIncome / Math.max(1, daysOfHistory / 30.44)
  const monthlyAvg = rolling30 * 30.44
  const monthlyNet = monthlyIncome - monthlyAvg

  const amounts = expenseTxns.map(t => Math.abs(t.amount))
  const outliers = detectOutliers(amounts)

  const largestTxn = expenseTxns.reduce((max, t) => (!max || Math.abs(t.amount) > Math.abs(max.amount)) ? t : max, null)

  const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayTotals = {}
  expenseTxns.forEach(t => { const d = new Date(t.date).getDay(); dayTotals[d] = (dayTotals[d] || 0) + Math.abs(t.amount) })
  const maxDay = Math.max(...Object.values(dayTotals), 0)
  const mostActiveDay = Object.keys(dayTotals).find(k => dayTotals[k] === maxDay)

  return {
    balance, savings, now,
    totalExpenses, totalIncome,
    rolling30, rolling90,
    dailyAvg: rolling30 || rolling90 || 1,
    weeklyAvg: (rolling30 || rolling90 || 1) * 7,
    monthlyAvg, monthlyIncome, monthlyNet,
    daysOfHistory,
    monthlyValues, monthlyMap, trend,
    catSpending, todaySpending,
    outlierCount: outliers.length,
    totalTxns: expenseTxns.length,
    expenseTxns, incomeTxns,
    largestTxn: largestTxn ? { amount: Math.abs(largestTxn.amount), desc: largestTxn.description || largestTxn.note || '' } : null,
    mostActiveDay: mostActiveDay !== undefined ? weekDays[parseInt(mostActiveDay)] : '-'
  }
}
