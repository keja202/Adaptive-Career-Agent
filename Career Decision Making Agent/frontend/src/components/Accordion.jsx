import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Accordion({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
      >
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        <div className="text-slate-500 text-sm">{open ? '—' : '+'}</div>
      </button>

      <motion.div
        initial={false}
        animate={open ? 'open' : 'closed'}
        variants={{
          open: { height: 'auto', opacity: 1 },
          closed: { height: 0, opacity: 0 }
        }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5">{children}</div>
      </motion.div>
    </div>
  )
}
