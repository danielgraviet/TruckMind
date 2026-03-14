import PersonaGrid from './PersonaGrid.jsx'

export default function ReactionBoard({ personas, personaStates }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Customer Reactions
        </h3>
        <span className="text-xs text-gray-600">{personas.length} personas</span>
      </div>

      {personas.length > 0 ? (
        <PersonaGrid personas={personas} personaStates={personaStates} />
      ) : (
        <div className="h-28 flex items-center justify-center text-gray-600 text-sm">
          Waiting for crowd generation…
        </div>
      )}
    </div>
  )
}
