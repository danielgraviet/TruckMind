import { useReducer, useCallback, useRef, useState, useEffect } from 'react'
import { connectToSimulation, connectMock } from '../api/simulationApi.js'

const REVEAL_INTERVAL_MS = 180

const initialState = {
  phase: 'idle',
  strategy: null,
  strategyOptions: [],
  testingIndex: null,
  totalStrategies: null,
  winnerIndex: null,
  winnerRationale: null,
  strategyResults: [],
  personas: [],
  personaStates: {},
  strategyPersonaStates: [],   // personaStates snapshot per strategy index
  stats: null,
  isRunning: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...initialState, isRunning: true }

    case 'SNAPSHOT': {
      const snap = action.payload

      // When testingIndex changes, clear old reaction states so dots reset color
      const indexChanged = snap.testingIndex !== null && snap.testingIndex !== state.testingIndex
      const phaseChangedToEval = snap.phase === 'evaluating' && state.phase === 'testing'
      const baseStates = indexChanged ? {} : { ...state.personaStates }

      // Snapshot persona reactions for the strategy we just finished testing
      const newStrategyPersonaStates = [...state.strategyPersonaStates]
      if ((indexChanged || phaseChangedToEval) && state.testingIndex !== null) {
        newStrategyPersonaStates[state.testingIndex] = { ...state.personaStates }
      }

      const existingIds = new Set(state.personas.map(p => p.id))
      const newPersonas = [...state.personas]
      const newPersonaStates = { ...baseStates }

      for (const p of snap.personas) {
        if (!existingIds.has(p.id)) {
          existingIds.add(p.id)
          newPersonas.push({
            id: p.id, name: p.name, age: p.age,
            occupation: p.occupation, annualIncome: p.annualIncome,
            priceSensitivity: p.priceSensitivity,
            dietaryRestrictions: p.dietaryRestrictions,
          })
        }
        if (p.sentiment !== null) {
          newPersonaStates[p.id] = {
            sentiment: p.sentiment, feedback: p.feedback,
            wouldVisit: p.wouldVisit, likelyOrder: p.likelyOrder,
          }
        }
      }

      return {
        ...state,
        phase: snap.phase,
        strategy:              snap.strategy        ?? state.strategy,
        strategyOptions:       snap.strategyOptions?.length ? snap.strategyOptions : state.strategyOptions,
        testingIndex:          snap.testingIndex    ?? state.testingIndex,
        totalStrategies:       snap.totalStrategies ?? state.totalStrategies,
        winnerIndex:           snap.winnerIndex     ?? state.winnerIndex,
        winnerRationale:       snap.winnerRationale ?? state.winnerRationale,
        strategyResults:       snap.strategyResults?.length ? snap.strategyResults : state.strategyResults,
        personas:              newPersonas,
        personaStates:         newPersonaStates,
        strategyPersonaStates: newStrategyPersonaStates,
        stats:                 snap.stats ?? state.stats,
      }
    }

    case 'STOP':
      return { ...state, isRunning: false }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

export function useSimulation() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [mockMode, setMockMode] = useState(true)
  const cleanupRef  = useRef(null)
  const mockModeRef = useRef(mockMode)
  mockModeRef.current = mockMode

  // ── Reveal buffer (personas appear gradually) ─────────────────────
  const bufferRef   = useRef([])
  const shownIdsRef = useRef(new Set())
  const [visiblePersonas, setVisiblePersonas] = useState([])

  useEffect(() => {
    for (const p of state.personas) {
      if (!shownIdsRef.current.has(p.id)) {
        shownIdsRef.current.add(p.id)
        bufferRef.current.push(p)
      }
    }
  }, [state.personas])

  useEffect(() => {
    const id = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const next = bufferRef.current.shift()
        setVisiblePersonas(prev => [...prev, next])
      }
    }, REVEAL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // ── Actions ──────────────────────────────────────────────────────

  const start = useCallback((concept, location) => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    bufferRef.current   = []
    shownIdsRef.current = new Set()
    setVisiblePersonas([])

    dispatch({ type: 'START' })

    const connector = mockModeRef.current ? connectMock : connectToSimulation
    cleanupRef.current = connector(
      concept,
      location,
      snapshot => dispatch({ type: 'SNAPSHOT', payload: snapshot }),
      err => {
        console.error('[useSimulation] error:', err)
        dispatch({ type: 'STOP' })
      },
    )
  }, [])

  const stop = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    dispatch({ type: 'STOP' })
  }, [])

  const reset = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    bufferRef.current   = []
    shownIdsRef.current = new Set()
    setVisiblePersonas([])
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state: { ...state, personas: visiblePersonas },
    mockMode, setMockMode,
    start, stop, reset,
  }
}
