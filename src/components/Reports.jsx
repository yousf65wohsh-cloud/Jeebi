import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useApp } from '../context/AppContext'

export default function Reports() {
  const { transactions = [], categories = [] } = useApp()

  const dataMap = {}
  ;(transactions ?? []).forEach(txn => {
    const cat = (categories ?? []).find(c => c.id === txn.categoryId)
    const name = cat?.name || 'غير محدد'
    const color = cat?.color || '#9ca3af'
    if (!dataMap[name]) dataMap[name] = { name, value: 0, color }
    dataMap[name].value += Math.abs(txn.amount || 0)
  })

  const data = Object.values(dataMap)
  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) return null

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={value => (value ?? 0).toLocaleString('en-US') + ' د.ع'} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-gray-500">{d.name}</span>
            <span className="font-medium text-gray-700">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
