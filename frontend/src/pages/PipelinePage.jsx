import { useEffect, useRef, useState } from 'react'
import { useSimulation } from '../hooks/useSimulation.js'
import ConceptInput    from '../components/pipeline/ConceptInput.jsx'
import StrategyCard, { StrategyTestCard, WinnerCard } from '../components/pipeline/StrategyCard.jsx'
import ReactionBoard   from '../components/pipeline/ReactionBoard.jsx'
import SimulationStats from '../components/pipeline/SimulationStats.jsx'
import PhaseIndicator  from '../components/shared/PhaseIndicator.jsx'
import { motion, AnimatePresence } from 'framer-motion'

const LAUNCH_DELAY = 20 // seconds to review before auto-launch

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

function LaunchCountdown({ seconds, paused, total, onLaunch, onPause, onResume }) {
  const pct = (seconds / total) * 100
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4"
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-800 rounded-full mb-3 overflow-hidden">
        <motion.div
          className="h-full bg-indigo-500 rounded-full origin-left"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {paused
            ? 'Auto-launch paused — review as long as you need.'
            : <span>Launching in <span className="text-white font-semibold tabular-nums">{seconds}s</span>…</span>
          }
        </p>
        <div className="flex items-center gap-2">
          {paused ? (
            <button
              onClick={onResume}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Resume countdown
            </button>
          ) : (
            <button
              onClick={onPause}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Keep reviewing
            </button>
          )}
          <button
            onClick={onLaunch}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Launch now →
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function PipelinePage({ onLaunch }) {
  const { state, mockMode, setMockMode, start, stop, reset } = useSimulation()
  const {
    phase, strategy, strategyOptions, testingIndex, totalStrategies,
    winnerIndex, winnerRationale, strategyResults,
    personas, personaStates, strategyPersonaStates, stats, isRunning,
  } = state

  const isIdle      = phase === 'idle'
  const isTesting   = phase === 'testing'
  const isEval      = phase === 'evaluating'
  const isComplete  = phase === 'complete'

  // Selected strategy tab (for reviewing all 3 when complete)
  const [selectedStrategyIndex, setSelectedStrategyIndex] = useState(null)

  useEffect(() => {
    if (isComplete && winnerIndex != null) setSelectedStrategyIndex(winnerIndex)
  }, [isComplete, winnerIndex])

  // Countdown state
  const [countdown, setCountdown] = useState(LAUNCH_DELAY)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!isComplete) return
    setCountdown(LAUNCH_DELAY)
    setPaused(false)
  }, [isComplete])

  useEffect(() => {
    if (!isComplete || paused) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          onLaunch?.(strategy, stats, mockMode)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isComplete, paused, strategy, stats, mockMode, onLaunch])
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
            ) : (
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
                    isSelected={isComplete && selectedStrategyIndex === i}
                    onClick={isComplete ? () => setSelectedStrategyIndex(i) : undefined}
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
                  strategy={selectedStrategyIndex != null ? strategyOptions[selectedStrategyIndex] : strategy}
                  stats={selectedStrategyIndex != null ? (getStrategyStats(selectedStrategyIndex) ?? stats) : stats}
                  rationale={selectedStrategyIndex === winnerIndex ? winnerRationale : null}
                  isWinner={selectedStrategyIndex === winnerIndex}
                />
              </div>
              <div className="space-y-4">
                <ReactionBoard
                  personas={personas}
                  personaStates={
                    selectedStrategyIndex != null && strategyPersonaStates[selectedStrategyIndex]
                      ? strategyPersonaStates[selectedStrategyIndex]
                      : personaStates
                  }
                  phase={phase}
                />
                <SimulationStats stats={selectedStrategyIndex != null ? (getStrategyStats(selectedStrategyIndex) ?? stats) : stats} phase={phase} />
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

          {/* Launch countdown */}
          {isComplete && (
            <LaunchCountdown
              seconds={countdown}
              paused={paused}
              total={LAUNCH_DELAY}
              onLaunch={() => onLaunch?.(strategy, stats, mockMode)}
              onPause={() => setPaused(true)}
              onResume={() => setPaused(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
