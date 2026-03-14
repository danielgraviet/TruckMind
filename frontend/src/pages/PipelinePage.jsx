import { useEffect, useRef, useState } from 'react'
import { useSimulation } from '../hooks/useSimulation.js'
import ConceptInput    from '../components/pipeline/ConceptInput.jsx'
import StrategyCard, { StrategyTestCard, WinnerCard } from '../components/pipeline/StrategyCard.jsx'
import ReactionBoard   from '../components/pipeline/ReactionBoard.jsx'
import SimulationStats from '../components/pipeline/SimulationStats.jsx'
import PhaseIndicator  from '../components/shared/PhaseIndicator.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Zap, Trophy } from 'lucide-react'

const LAUNCH_DELAY = 20 // seconds to review before auto-launch

function EvaluatingBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 animate-spin"
        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(201,241,53,0.2)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Evaluating strategies…
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
          Scoring all 3 by interest rate, revenue, sentiment & margin
        </div>
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
      className="rounded-2xl p-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Progress bar */}
      <div className="h-0.5 rounded-full mb-3.5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        <motion.div
          className="h-full rounded-full origin-left"
          style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
          {paused
            ? 'Auto-launch paused — review as long as you need.'
            : <span>Launching in <span className="font-semibold tabular-nums" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{seconds}s</span>…</span>
          }
        </p>
        <div className="flex items-center gap-3">
          {paused ? (
            <button
              onClick={onResume}
              className="text-xs transition-colors"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Resume countdown
            </button>
          ) : (
            <button
              onClick={onPause}
              className="text-xs transition-colors"
              style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              Keep reviewing
            </button>
          )}
          <button
            onClick={onLaunch}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all"
            style={{
              background: 'var(--accent)',
              color: '#0f0f0f',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 0 16px var(--accent-glow)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 24px var(--accent-glow)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 16px var(--accent-glow)'}
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
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* ── Idle: hero + concept input ── */}
      {isIdle && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-3 pt-4"
          >
            <h1
              className="text-3xl font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Know your market{' '}
              <span style={{ color: 'var(--accent)' }}>
                before you spend a dime
              </span>
            </h1>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
              Describe your concept. TruckMind builds your customer base from real census data,
              tests three strategies, and picks the winner — autonomously.
            </p>

            {/* Feature pills */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              {[
                { icon: <Users className="w-3.5 h-3.5" />,  label: '100 census-grounded personas' },
                { icon: <Zap   className="w-3.5 h-3.5" />,  label: '3 strategies tested' },
                { icon: <Trophy className="w-3.5 h-3.5" />, label: 'AI picks the winner' },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-2)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {icon}{label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <ConceptInput
              onRun={start}
              isRunning={false}
              mockMode={mockMode}
              onToggleMock={() => setMockMode(!mockMode)}
              buttonLabel="Find Best Strategy"
            />
          </motion.div>
        </div>
      )}

      {/* ── Active pipeline ── */}
      {!isIdle && (
        <>
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <PhaseIndicator phase={phase} />
            {isRunning ? (
              <button
                onClick={stop}
                className="text-xs transition-colors"
                style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              >
                Stop
              </button>
            ) : (
              <button
                onClick={reset}
                className="text-xs transition-colors"
                style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              >
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
