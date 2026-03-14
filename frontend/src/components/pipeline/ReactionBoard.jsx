import PersonaGrid from './PersonaGrid.jsx'

function AvatarSkeleton() {
  return <div className="w-9 h-9 rounded-full animate-pulse shrink-0" style={{ background: 'var(--bg-card)' }} />
}

export default function ReactionBoard({ personas, personaStates, phase }) {
  const isLoading = phase !== 'idle' && personas.length === 0

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
        >
          Customer Reactions
        </h3>
        {isLoading ? (
          <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
        ) : (
          <span
            className="text-[11px] tabular-nums"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}
          >
            {personas.length} personas
          </span>
        )}
      </div>

      {personas.length > 0 ? (
        <PersonaGrid personas={personas} personaStates={personaStates} />
      ) : isLoading ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 40 }).map((_, i) => (
            <AvatarSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div
          className="h-28 flex items-center justify-center text-sm"
          style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
        >
          Waiting for crowd generation…
        </div>
      )}
    </div>
  )
}
