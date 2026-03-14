import PersonaGrid from './PersonaGrid.jsx'

function AvatarSkeleton() {
  return <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse shrink-0" />
}

export default function ReactionBoard({ personas, personaStates, phase }) {
  const isLoading = phase !== 'idle' && personas.length === 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Customer Reactions
        </h3>
        {isLoading ? (
          <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
        ) : (
          <span className="text-xs text-gray-600">{personas.length} personas</span>
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
        <div className="h-28 flex items-center justify-center text-gray-600 text-sm">
          Waiting for crowd generation…
        </div>
      )}
    </div>
  )
}
