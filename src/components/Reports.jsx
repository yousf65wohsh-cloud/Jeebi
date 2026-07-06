import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import SmartInsights from './SmartInsights'

export default function Reports() {
  const { transactions = [], categories = [] } = useApp()

  const dataMap = {}
  ;(transactions ?? []).forEach((txn) => {
    const cat = (categories ?? []).find((c) => c.id === txn.categoryId)
    const name = cat?.name || 'غير محدد'
    const color = cat?.color || '#9ca3af'
    if (!dataMap[name]) dataMap[name] = { name, value: 0, color }
    dataMap[name].value += txn.amount
  })

  const data = Object.values(dataMap)
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold text-gray-800">التقارير</h2>
      </div>
      {data.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">لا توجد بيانات للعرض</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => (value ?? 0).toLocaleString('en-US') + ' د.ع'}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-gray-600">{d.name}</span>
                <span className="font-medium text-gray-800">
                  ({((d.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
          <SmartInsights />
        </>
      )}
    </div>
  )
}
