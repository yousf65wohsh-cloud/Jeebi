export function predictGoals(goals, stats, monthlyNet) {
  return (goals || [])
    .filter(g => !g.completed && g.target_amount > 0)
    .map(g => {
      const target = g.target_amount || 0
      const saved = g.saved_amount || 0
      const remaining = Math.max(0, target - saved)
      const monthlySavings = g.transfer_amount || 0
      const progressPct = target > 0 ? (saved / target) * 100 : 0

      const monthsRemaining = monthlySavings > 0 ? remaining / monthlySavings : 999
      const daysRemaining = monthsRemaining * 30.44

      const consistBonus = stats.monthlyValues?.length > 3 ? 10 : 0
      const savingPower = Math.max(0, monthlyNet || 0) > 0 ? 5 : 0
      const probability = Math.round(Math.min(Math.max(
        (saved / Math.max(target, 1)) * 40 +
        (monthlySavings > 0 ? 25 : 0) +
        (monthsRemaining < 6 ? 20 : monthsRemaining < 12 ? 15 : monthsRemaining < 24 ? 10 : 5) +
        consistBonus + savingPower,
        3
      ), 99))

      const monthsDelay = monthlySavings > 0
        ? Math.min(Math.round(monthsRemaining * 0.15), 36)
        : 12

      const improvedSavings = monthlySavings * 1.2
      const improvedMonths = improvedSavings > 0 ? remaining / improvedSavings : 999
      const monthsSaved = monthlySavings > 0
        ? Math.max(0, Math.round(monthsRemaining - improvedMonths))
        : 0

      const completionDate = monthlySavings > 0
        ? new Date(Date.now() + monthsRemaining * 30.44 * 24 * 60 * 60 * 1000)
        : null

      return {
        id: g.id,
        title: g.title,
        targetAmount: target,
        savedAmount: saved,
        remaining,
        progressPct: Math.round(progressPct * 10) / 10,
        monthsRemaining: Math.ceil(monthsRemaining),
        daysRemaining: Math.round(daysRemaining),
        probability,
        monthsDelay,
        monthsSaved,
        monthlySavings,
        completed: g.completed,
        completionDate
      }
    })
    .sort((a, b) => a.monthsRemaining - b.monthsRemaining)
}

export function calcGoalImpact(goals, spendingIncreasePct, savingsIncreaseAmt) {
  return (goals || [])
    .filter(g => !g.completed && g.target_amount > 0)
    .map(g => {
      const remaining = Math.max(0, (g.target_amount || 0) - (g.saved_amount || 0))
      const monthlySavings = g.transfer_amount || 0

      const effectiveSavings = monthlySavings - (monthlySavings * (spendingIncreasePct / 100))
      const delayMonths = monthlySavings > 0 && effectiveSavings > 0
        ? Math.max(0, Math.round((remaining / effectiveSavings) - (remaining / monthlySavings)))
        : 0

      const boostedSavings = monthlySavings + (savingsIncreaseAmt || 0)
      const boostMonths = boostedSavings > 0 && monthlySavings > 0
        ? Math.max(0, Math.round((remaining / monthlySavings) - (remaining / boostedSavings)))
        : 0

      return {
        id: g.id,
        title: g.title,
        delayMonths,
        boostMonths: Math.round(boostMonths)
      }
    })
}
