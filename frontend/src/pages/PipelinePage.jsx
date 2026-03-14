import { useSimulation } from '../hooks/useSimulation.js'
import ConceptInput    from '../components/pipeline/ConceptInput.jsx'
import StrategyCard, { StrategyTestCard, WinnerCard } from '../components/pipeline/StrategyCard.jsx'
import ReactionBoard   from '../components/pipeline/ReactionBoard.jsx'
import SimulationStats from '../components/pipeline/SimulationStats.jsx'
import PhaseIndicator  from '../components/shared/PhaseIndicator.jsx'
import { motion, AnimatePresence } from 'framer-motion'

function EvaluatingBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
    >
      <span className="text-lg animate-spin">⚙️</span>
      <div>
        <div className="text-sm font-semibold text-white">Evaluating strategies…</div>
        <div className="text-xs text-gray-500 mt-0.5">Scoring all 3 by interest rate, revenue, sentiment & margin</div>
      </div>
    </motion.div>
  )
}

export default function PipelinePage({ onLaunch }) {
  const { state, mockMode, setMockMode, start, stop, reset } = useSimulation()
  const {
    phase, strategy, strategyOptions, testingIndex, totalStrategies,
    winnerIndex, winnerRationale, strategyResults,
    personas, personaStates, stats, isRunning,
  } = state

  const isIdle      = phase === 'idle'
  const isTesting   = phase === 'testing'
  const isEval      = phase === 'evaluating'
  const isComplete  = phase === 'complete'
  const hasOptions  = strategyOptions.length > 0
  const showStrip   = hasOptions && (isTesting || isEval || isComplete || phase === 'simulation')

  // Find per-strategy stats from results (available once complete)
  const getStrategyStats = (idx) => {
    if (!strategyResults.length) return null
    return strategyResults[idx]?.stats ?? null
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

      {/* ── Idle: concept input ── */}
      {isIdle && (
        <div className="max-w-2xl mx-auto space-y-4">
          <ConceptInput
            onRun={start}
            isRunning={false}
            mockMode={mockMode}
            onToggleMock={() => setMockMode(!mockMode)}
            buttonLabel="Find Best Strategy"
          />
        </div>
      )}

      {/* ── Active pipeline ── */}
      {!isIdle && (
        <>
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <PhaseIndicator phase={phase} />
            {isRunning ? (
              <button onClick={stop} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Stop
              </button>
            ) : !isComplete && (
              <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                ← New concept
              </button>
            )}
          </div>

          {/* Strategy test strip (3 cards side by side) */}
          <AnimatePresence>
            {showStrip && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-3"
              >
                {strategyOptions.map((s, i) => (
                  <StrategyTestCard
                    key={i}
                    strategy={s}
                    isCurrent={isTesting && testingIndex === i}
                    isComplete={isComplete || (strategyResults.length > i)}
                    stats={getStrategyStats(i)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Evaluating banner */}
          {isEval && <EvaluatingBanner />}

          {/* Main content: winner card + reaction board */}
          {isComplete ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <WinnerCard
                  strategy={strategy}
                  stats={stats}
                  rationale={winnerRationale}
                />
              </div>
              <div className="space-y-4">
                <ReactionBoard personas={personas} personaStates={personaStates} phase={phase} />
                <SimulationStats stats={stats} phase={phase} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <StrategyCard strategy={strategy} phase={phase} />
              </div>
              <div className="space-y-4">
                <ReactionBoard personas={personas} personaStates={personaStates} phase={phase} />
              </div>
            </div>
          )}

          {/* Launch button */}
          {isComplete && onLaunch && (
            <div className="flex justify-center pt-4 pb-8">
              <button
                onClick={() => onLaunch(strategy, stats)}
                className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg tracking-wide transition-colors shadow-lg"
                style={{ boxShadow: '0 0 24px 4px rgba(99,102,241,0.45)' }}
              >
                Launch Business →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
