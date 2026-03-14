const PHASES = [
  { id: 'strategy',   label: 'Strategy'   },
  { id: 'personas',   label: 'Crowd'      },
  { id: 'simulation', label: 'Simulation' },
  { id: 'complete',   label: 'Complete'   },
]

const PHASE_ORDER = ['idle', 'strategy', 'personas', 'simulation', 'complete']

export default function PhaseIndicator({ phase }) {
  const currentIndex = PHASE_ORDER.indexOf(phase)

  return (
    <div className="flex items-center gap-1.5">
      {PHASES.map((p, i) => {
        const phaseIndex = PHASE_ORDER.indexOf(p.id)
        const done   = phaseIndex < currentIndex
        const active = phaseIndex === currentIndex

        return (
          <div key={p.id} className="flex items-center gap-1.5">
            {i > 0 && (
              <div className={`h-px w-6 ${done ? 'bg-indigo-500' : 'bg-gray-700'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  done   ? 'bg-indigo-500' :
                  active ? 'bg-indigo-400 ring-2 ring-indigo-400/30' :
                           'bg-gray-700'
                }`}
              />
              <span
                className={`text-xs transition-colors ${
                  done   ? 'text-indigo-400' :
                  active ? 'text-white font-medium' :
                           'text-gray-600'
                }`}
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
