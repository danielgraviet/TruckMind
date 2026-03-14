const PHASES = [
  { id: 'strategy',   label: 'Strategy'   },
  { id: 'personas',   label: 'Crowd'      },
  { id: 'simulation', label: 'Simulate'   },
  { id: 'complete',   label: 'Complete'   },
]

const PHASE_ORDER = ['idle', 'strategy', 'personas', 'simulation', 'complete']

export default function PhaseIndicator({ phase }) {
  const currentIndex = PHASE_ORDER.indexOf(phase)

  return (
    <div className="flex items-center gap-2">
      {PHASES.map((p, i) => {
        const phaseIndex = PHASE_ORDER.indexOf(p.id)
        const done   = phaseIndex < currentIndex
        const active = phaseIndex === currentIndex

        return (
          <div key={p.id} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className="h-px w-8 transition-colors duration-500"
                style={{ background: done ? 'var(--accent)' : 'var(--border-strong)' }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{
                  background: done ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--text-3)',
                  boxShadow: active ? '0 0 6px var(--accent-glow)' : 'none',
                  transform: active ? 'scale(1.3)' : 'scale(1)',
                }}
              />
              <span
                className="text-xs transition-colors duration-300"
                style={{
                  color: done ? 'var(--accent)' : active ? 'var(--text-1)' : 'var(--text-3)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {p.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
