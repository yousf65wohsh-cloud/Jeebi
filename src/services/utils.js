export function formatSafeDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US')
  } catch {}
  return '—'
}
