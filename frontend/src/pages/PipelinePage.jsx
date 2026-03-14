import { useSimulation } from '../hooks/useSimulation.js'
import ConceptInput    from '../components/pipeline/ConceptInput.jsx'
import StrategyCard    from '../components/pipeline/StrategyCard.jsx'
import ReactionBoard   from '../components/pipeline/ReactionBoard.jsx'
import SimulationStats from '../components/pipeline/SimulationStats.jsx'
import PhaseIndicator  from '../components/shared/PhaseIndicator.jsx'

export default function PipelinePage({ onLaunch }) {
  const { state, mockMode, setMockMode, start, stop } = useSimulation()
  const { phase, strategy, personas, personaStates, stats, isRunning } = state

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Top bar: phase stepper + stop button */}
      <div className="flex items-center justify-between">
        <PhaseIndicator phase={phase} />
        {isRunning && (
          <button
            onClick={stop}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Stop
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: input + strategy */}
        <div className="space-y-4">
          <ConceptInput
            onRun={start}
            isRunning={isRunning}
            mockMode={mockMode}
            onToggleMock={() => setMockMode(!mockMode)}
          />
          <StrategyCard strategy={strategy} />
        </div>

        {/* Right: persona grid + stats */}
        <div className="space-y-4">
          <ReactionBoard
            personas={personas}
            personaStates={personaStates}
          />
          <SimulationStats stats={stats} />
        </div>
      </div>

      {/* Launch CTA — shown when simulation is complete */}
      {phase === 'complete' && onLaunch && (
        <div className="flex justify-center pt-4 pb-8">
          <button
            onClick={() => onLaunch(strategy, stats)}
            className="relative px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg tracking-wide transition-colors shadow-lg shadow-indigo-900/50 animate-pulse-glow"
            style={{ boxShadow: '0 0 24px 4px rgba(99,102,241,0.45)' }}
          >
            Launch Business →
          </button>
        </div>
      )}
    </div>
  )
}
