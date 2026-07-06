export function calcStats({ transactions = [], categories = [], balance = 0, savings = 0 }) {
  const now = new Date()
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))

  const incomeTxns = sorted.filter(t => t.amount > 0)
  const expenseTxns = sorted.filter(t => t.amount < 0)

  const totalIncome = incomeTxns.reduce((s, t) => s + t.amount, 0)
  const totalExpenses = Math.abs(expenseTxns.reduce((s, t) => s + Math.abs(t.amount), 0))

  const oldestDate = sorted.length > 0 ? new Date(sorted[0].date) : now
  const daysOfHistory = Math.max(1, (now - oldestDate) / (1000 * 60 * 60 * 24))
  const monthsOfHistory = Math.max(1, daysOfHistory / 30.44)

  const dailyAvg = totalExpenses / daysOfHistory
  const weeklyAvg = totalExpenses / Math.max(1, daysOfHistory / 7)
  const monthlyAvg = totalExpenses / monthsOfHistory
  const monthlyIncome = totalIncome / monthsOfHistory
  const monthlyNet = monthlyIncome - monthlyAvg

  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
  const recentExpenseTxns = expenseTxns.filter(t => new Date(t.date) >= thirtyDaysAgo)
  const recentExpenses = recentExpenseTxns.reduce((s, t) => s + Math.abs(t.amount), 0)

  const monthlyMap = {}
  expenseTxns.forEach(t => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = (monthlyMap[key] || 0) + Math.abs(t.amount)
  })
  const monthlyKeys = Object.keys(monthlyMap).sort()
  const monthlyValues = monthlyKeys.map(k => monthlyMap[k])

  let trend = 0
  if (monthlyValues.length >= 4) {
    const half = Math.floor(monthlyValues.length / 2)
    const recent = monthlyValues.slice(half).reduce((s, v) => s + v, 0) / Math.max(1, monthlyValues.length - half)
    prev = monthlyValues.slice(0, half).reduce((s, v) => s + v, 0) / Math.max(1, half)
    trend = prev > 0 ? ((recent - prev) / prev) * 100 : 0
  } else if (monthlyValues.length >= 2) {
    const recent = monthlyValues[monthlyValues.length - 1]
    const prev = monthlyValues[0]
    trend = prev > 0 ? ((recent - prev) / prev) * 100 : 0
  }
  let prev

  const weekdayTotals = {}
  expenseTxns.forEach(t => {
    const day = new Date(t.date).getDay()
    weekdayTotals[day] = (weekdayTotals[day] || 0) + Math.abs(t.amount)
  })
  const maxDayAmount = Math.max(...Object.values(weekdayTotals), 0)
  const mostActiveDay = Object.keys(weekdayTotals).find(k => weekdayTotals[k] === maxDayAmount)

  const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const mostActiveDayName = mostActiveDay !== undefined ? weekDays[parseInt(mostActiveDay)] : '-'

  const weeklyMap = {}
  expenseTxns.forEach(t => {
    const d = new Date(t.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    weeklyMap[key] = (weeklyMap[key] || 0) + Math.abs(t.amount)
  })
  const weeklyKeys = Object.keys(weeklyMap).sort()
  const weeklyValues = weeklyKeys.map(k => weeklyMap[k])

  const catSpending = {}
  expenseTxns.forEach(t => {
    const cat = categories.find(c => c.id === t.category_id || c.id === t.categoryId)
    const name = cat?.name || 'أخرى'
    const color = cat?.color || '#6b7280'
    const budget = cat?.budget || 0
    if (!catSpending[name]) catSpending[name] = { amount: 0, budget, color }
    catSpending[name].amount += Math.abs(t.amount)
  })

  const largestTxn = expenseTxns.reduce((max, t) => (!max || Math.abs(t.amount) > Math.abs(max.amount)) ? t : max, null)

  return {
    totalIncome, totalExpenses, monthlyIncome, monthlyAvg, monthlyNet,
    weeklyAvg, dailyAvg, recentExpenses,
    daysOfHistory, monthsOfHistory,
    monthlyMap, monthlyKeys, monthlyValues, trend,
    weeklyMap, weeklyKeys, weeklyValues,
    catSpending, mostActiveDayName,
    largestTxn: largestTxn ? { amount: Math.abs(largestTxn.amount), desc: largestTxn.description || largestTxn.note || '' } : null,
    balance, savings, expenseTxns, incomeTxns, now
  }
}
