import { useState, useMemo } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { useApp } from '../context/AppContext'

const INITIAL_FILTERS = { search: '', categoryId: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' }

export default function FilterBar({ filters, setFilters, onReset }) {
  const { categories = [] } = useApp()
  const [showPanel, setShowPanel] = useState(false)

  console.log('[FilterBar] useMemo before:', {
    filtersType: typeof filters, filtersValue: filters,
    onResetType: typeof onReset, setFiltersType: typeof setFilters,
  })

  const hasActive = useMemo(() =>
    Object.values(filters ?? INITIAL_FILTERS).some((v) => v !== ''),
    [filters]
  )

  const set = (key, value) => {
    if (typeof setFilters !== 'function') return
    setFilters((prev) => ({ ...(prev ?? INITIAL_FILTERS), [key]: value }))
  }

  const handleReset = () => {
    if (typeof onReset === 'function') onReset()
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters?.search ?? ''}
            onChange={(e) => set('search', e.target.value)}
            placeholder="بحث في الوصف..."
            className="w-full border border-gray-200 rounded-lg pr-9 pl-3 py-2 text-sm outline-none focus:border-orange-400"
          />
          {(filters?.search ?? '') && (
            <button
              onClick={() => set('search', '')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border cursor-pointer transition-colors
            ${hasActive ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <Filter size={14} />
          فلتر
          {hasActive && <span className="w-2 h-2 rounded-full bg-orange-500" />}
        </button>
      </div>

      {showPanel && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">المحفظة</label>
            <select
              value={filters?.categoryId ?? ''}
              onChange={(e) => set('categoryId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 bg-white"
            >
              <option value="">الكل</option>
              {(categories ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
            <input
              type="date"
              value={filters?.dateFrom ?? ''}
              onChange={(e) => set('dateFrom', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={filters?.dateTo ?? ''}
              onChange={(e) => set('dateTo', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">أقل مبلغ</label>
              <input
                type="number"
                value={filters?.amountMin ?? ''}
                onChange={(e) => set('amountMin', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">أقصى مبلغ</label>
              <input
                type="number"
                value={filters?.amountMax ?? ''}
                onChange={(e) => set('amountMax', e.target.value)}
                placeholder="10000"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400"
              />
            </div>
          </div>
          {hasActive && (
            <div className="col-span-2 md:col-span-4 flex justify-center">
              <button
                onClick={handleReset}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
              >
                <X size={12} /> إلغاء جميع الفلاتر
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
