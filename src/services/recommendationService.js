export function generateRecommendations(stats, catSpending, goals) {
  const recs = []

  const entries = Object.entries(catSpending || {})
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.amount - a.amount)

  if (entries.length > 0) {
    const top = entries[0]
    const pct = stats.totalExpenses > 0 ? (top.amount / stats.totalExpenses) * 100 : 0
    const yearly = top.amount * (12 / Math.max(1, stats.daysOfHistory / 30.44))
    if (pct > 15) {
      recs.push({
        type: 'category', title: top.name, pct: Math.round(pct), savings: Math.round(yearly * 0.1),
        text: `تنفق ${Math.round(pct)}% على ${top.name}. تخفيض 10% قد يوفر ${Math.round(yearly * 0.1).toLocaleString('en-US')} د.ع سنويًا.`
      })
    }
  }

  const savingsRatio = stats.balance > 0 ? (stats.savings / stats.balance) * 100 : 0
  if (savingsRatio < 15 && stats.balance > 0) {
    recs.push({
      type: 'savings', current: Math.round(savingsRatio), target: 20, extraMonthly: Math.round(stats.monthlyIncome * 0.2),
      text: `نسبة الادخار (${Math.round(savingsRatio)}%) أقل من الموصى به (20%). حاول ادخار ${Math.round(stats.monthlyIncome * 0.2).toLocaleString('en-US')} د.ع شهريًا.`
    })
  }

  const weeklyKeys = Object.keys(stats.weeklyMap || {}).sort()
  if (weeklyKeys.length >= 2) {
    const last = stats.weeklyMap[weeklyKeys[weeklyKeys.length - 1]] || 0
    const prev = stats.weeklyMap[weeklyKeys[weeklyKeys.length - 2]] || 0
    if (last > prev * 1.25 && prev > 0) {
      recs.push({
        type: 'alert', weekTotal: Math.round(last), prevTotal: Math.round(prev),
        text: `مصاريف هذا الأسبوع (${Math.round(last).toLocaleString('en-US')} د.ع) أعلى ${Math.round((last / prev - 1) * 100)}% من الأسبوع الماضي.`
      })
    }
  }

  if (stats.trend > 15) {
    recs.push({
      type: 'trend', direction: 'up', pct: Math.round(stats.trend),
      text: `مصاريفك في ارتفاع ${Math.round(stats.trend)}%. راجع فئات الإنفاق.`
    })
  }

  const activeGoals = (goals || []).filter(g => !g.completed && g.transfer_amount > 0)
  if (activeGoals.length > 0 && entries.length > 0) {
    const yearlyTop = entries[0].amount * (12 / Math.max(1, stats.daysOfHistory / 30.44))
    const potential = Math.round(yearlyTop * 0.15 / 12)
    if (potential > 0) {
      recs.push({
        type: 'goalBoost', title: entries[0].name, amount: potential,
        text: `تخفيض ${entries[0].name} قد يحرر ${potential.toLocaleString('en-US')} د.ع شهريًا لأهدافك.`
      })
    }
  }

  if (recs.length === 0) {
    recs.push({ type: 'general', text: 'وضعك المالي مستقر. استمر في تتبع معاملاتك.' })
  }

  return recs.slice(0, 4)
}
