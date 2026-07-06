export function generateRecommendations(stats, catSpending, goals, healthScore) {
  const recs = []

  const catEntries = Object.entries(catSpending || {})
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount)

  if (catEntries.length > 0) {
    const top = catEntries[0]
    const topPct = stats.totalExpenses > 0 ? (top.amount / stats.totalExpenses) * 100 : 0
    const yearlyTop = top.amount * (12 / Math.max(1, stats.monthsOfHistory))
    const savings10Pct = yearlyTop * 0.1

    recs.push({
      type: 'category',
      title: top.name,
      pct: Math.round(topPct),
      yearly: Math.round(yearlyTop),
      savings: Math.round(savings10Pct),
      text: `تنفق ${Math.round(topPct)}% من أموالك على ${top.name}. تخفيض هذه الفئة بنسبة 10% قد يوفر ${Math.round(savings10Pct).toLocaleString('en-US')} د.ع سنويًا.`
    })

    if (catEntries.length > 1) {
      const second = catEntries[1]
      const secondPct = stats.totalExpenses > 0 ? (second.amount / stats.totalExpenses) * 100 : 0
      if (secondPct > 10) {
        const secondYearly = second.amount * (12 / Math.max(1, stats.monthsOfHistory))
        recs.push({
          type: 'category',
          title: second.name,
          pct: Math.round(secondPct),
          yearly: Math.round(secondYearly),
          savings: Math.round(secondYearly * 0.1),
          text: `${second.name} تمثل ${Math.round(secondPct)}% من إنفاقك. ترشيدها قد يوفر ${Math.round(secondYearly * 0.1).toLocaleString('en-US')} د.ع سنويًا.`
        })
      }
    }
  }

  const weeklyKeys = Object.keys(stats.weeklyMap || {}).sort()
  if (weeklyKeys.length >= 3) {
    const last3 = weeklyKeys.slice(-3).map(k => stats.weeklyMap[k])
    const allIncreasing = last3[2] > last3[1] && last3[1] > last3[0]
    if (allIncreasing && last3[0] > 0) {
      const pctIncrease = Math.round(((last3[2] - last3[0]) / last3[0]) * 100)
      if (pctIncrease > 15) {
        const topTransport = catEntries.find(c => c.name === 'مواصلات' || c.name === 'النقل')
        if (topTransport) {
          recs.push({
            type: 'trend',
            title: topTransport.name,
            direction: 'up',
            pct: pctIncrease,
            text: `مصاريف ${topTransport.name} في ارتفاع للأسبوع الثالث على التوالي (${pctIncrease}%).`
          })
        } else {
          recs.push({
            type: 'trend',
            title: catEntries[0]?.name || 'المصاريف',
            direction: 'up',
            pct: pctIncrease,
            text: `إنفاقك في ارتفاع مستمر بنسبة ${pctIncrease}% خلال الأسابيع الثلاثة الماضية.`
          })
        }
      }
    }
    if (last3[2] < last3[0] && last3[0] > 0) {
      const pctDrop = Math.round(((last3[0] - last3[2]) / last3[0]) * 100)
      if (pctDrop > 10) {
        recs.push({
          type: 'trend',
          title: 'الإنفاق',
          direction: 'down',
          pct: pctDrop,
          text: `نمط إنفاقك الحالي أفضل من الشهر الماضي — انخفاض بنسبة ${pctDrop}%.`
        })
      }
    }
  }

  const savingsRatio = stats.balance > 0 ? (stats.savings / stats.balance) * 100 : 0
  if (savingsRatio < 15 && stats.balance > 0) {
    const recommendedMonthly = stats.monthlyIncome * 0.2
    recs.push({
      type: 'savings',
      current: Math.round(savingsRatio),
      target: 20,
      extraMonthly: Math.round(recommendedMonthly),
      text: `نسبة الادخار لديك (${Math.round(savingsRatio)}%) أقل من المستوى الموصى به (20%). حاول ادخار ${Math.round(recommendedMonthly).toLocaleString('en-US')} د.ع شهريًا.`
    })
  }

  Object.entries(catSpending || {}).forEach(([name, data]) => {
    if ((data.budget || 0) > 0) {
      const monthlyRate = data.amount / Math.max(1, stats.monthsOfHistory)
      const budget = data.budget
      if (monthlyRate > budget * 0.85 && budget > 0) {
        recs.push({
          type: 'budgetWarning',
          title: name,
          budget,
          current: Math.round(monthlyRate),
          text: `من المحتمل أن تتجاوز ميزانية ${name} الأسبوع القادم (${Math.round(monthlyRate).toLocaleString('en-US')} د.ع / ${budget.toLocaleString('en-US')} د.ع).`
        })
      }
    }
  })

  if (weeklyKeys.length >= 2) {
    const lastWeek = stats.weeklyMap[weeklyKeys[weeklyKeys.length - 1]] || 0
    const prevWeek = stats.weeklyMap[weeklyKeys[weeklyKeys.length - 2]] || 0
    if (lastWeek > prevWeek * 1.25 && prevWeek > 0) {
      recs.push({
        type: 'weeklyAlert',
        weekTotal: Math.round(lastWeek),
        prevTotal: Math.round(prevWeek),
        text: `مصاريف هذا الأسبوع (${Math.round(lastWeek).toLocaleString('en-US')} د.ع) أعلى بنسبة ${Math.round((lastWeek / prevWeek - 1) * 100)}% من الأسبوع الماضي.`
      })
    }
  }

  const activeGoals = (goals || []).filter(g => !g.completed && g.target_amount > 0)
  if (activeGoals.length > 0) {
    const nearGoal = activeGoals.sort((a, b) => {
      const aRemaining = (a.target_amount || 0) - (a.saved_amount || 0)
      const bRemaining = (b.target_amount || 0) - (b.saved_amount || 0)
      const aRate = a.transfer_amount || 0
      const bRate = b.transfer_amount || 0
      return (aRate > 0 ? aRemaining / aRate : 999) - (bRate > 0 ? bRemaining / bRate : 999)
    })[0]
    if (nearGoal && nearGoal.transfer_amount > 0) {
      const remaining = (nearGoal.target_amount || 0) - (nearGoal.saved_amount || 0)
      const boost = (nearGoal.transfer_amount || 0) * 0.5
      const monthsSaved = boost > 0 ? Math.round(remaining / (nearGoal.transfer_amount + boost)) : 0
      const currentMonths = Math.round(remaining / nearGoal.transfer_amount)
      if (monthsSaved < currentMonths && monthsSaved > 0) {
        recs.push({
          type: 'goalBoost',
          title: nearGoal.title,
          monthsSaved: currentMonths - monthsSaved,
          text: `زيادة التحويل الشهري لهدف "${nearGoal.title}" بنسبة 50% قد ينهيه قبل موعده بـ ${currentMonths - monthsSaved} شهرًا.`
        })
      }
    }
  }

  if (recs.length === 0) {
    recs.push({
      type: 'general',
      text: 'وضعك المالي مستقر. استمر في تتبع معاملاتك للحصول على توصيات أكثر دقة.'
    })
  }

  return recs.slice(0, 5)
}
