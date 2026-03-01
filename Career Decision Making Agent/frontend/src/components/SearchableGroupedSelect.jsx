import { useEffect, useMemo, useRef, useState } from 'react'

export default function SearchableGroupedSelect({
  options,
  value,
  onChange,
  placeholder,
  getOptionLabel,
  getOptionValue,
  groupBy,
  className,
}) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => {
    const v = String(value ?? '')
    return (options || []).find((o) => String(getOptionValue(o)) === v) || null
  }, [options, value, getOptionValue])

  const [query, setQuery] = useState('')

  useEffect(() => {
    const onDoc = (e) => {
      const el = rootRef.current
      if (!el) return
      if (!el.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase()
    const base = Array.isArray(options) ? options : []
    if (!q) return base
    return base.filter((o) => String(getOptionLabel(o) || '').toLowerCase().includes(q))
  }, [options, query, getOptionLabel])

  const grouped = useMemo(() => {
    const groups = new Map()
    for (const o of filtered) {
      const g = String(groupBy?.(o) || 'Other')
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g).push(o)
    }
    const out = Array.from(groups.entries())
    out.sort((a, b) => a[0].localeCompare(b[0]))
    return out
  }, [filtered, groupBy])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          className ||
          'w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-left outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div className={selected ? 'text-slate-900' : 'text-slate-400'}>
            {selected ? String(getOptionLabel(selected)) : placeholder || 'Select…'}
          </div>
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-400" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-3 border-b border-slate-200">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="max-h-72 overflow-auto">
            {grouped.length ? (
              grouped.map(([group, items]) => (
                <div key={group} className="py-2">
                  <div className="sticky top-0 z-10 px-3 py-2 bg-slate-50/95 backdrop-blur border-y border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-1 rounded-full bg-blue-600" />
                      <div className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">
                        {group}
                      </div>
                    </div>
                  </div>
                  {items.map((o) => {
                    const ov = String(getOptionValue(o))
                    const isActive = String(value ?? '') === ov
                    return (
                      <button
                        key={ov}
                        type="button"
                        onClick={() => {
                          onChange(ov)
                          setOpen(false)
                        }}
                        className={
                          isActive
                            ? 'w-full px-3 py-2.5 text-left text-sm bg-blue-50 text-blue-700 font-semibold'
                            : 'w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 text-slate-900'
                        }
                      >
                        {String(getOptionLabel(o))}
                      </button>
                    )
                  })}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-slate-500">No results</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
