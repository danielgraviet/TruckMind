import { useReducer, useCallback, useRef, useState } from 'react'
import { SENTIMENT_EMOJIS } from '../constants/sentiments.js'
import { connectToSimulation, connectMock } from '../api/simulationApi.js'

// ─────────────────────────── State shape ─────────────────────────────
// {
//   phase: 'idle' | 'strategy' | 'personas' | 'simulation' | 'complete'
//   strategy: null | { businessName, tagline, menu }
//   personas: []          // ordered by appearance; base info only
//   personaStates: {}     // { [id]: { sentiment, feedback, wouldVisit, likelyOrder } }
//   stats: null | { ... }
//   isRunning: boolean
// }

const initialState = {
  phase: 'idle',
  strategy: null,
  personas: [],
  personaStates: {},
  stats: null,
  isRunning: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...initialState, isRunning: true }

    case 'SNAPSHOT': {
      const snap = action.payload
      const existingIds = new Set(state.personas.map(p => p.id))
      const newPersonas = [...state.personas]
      const newPersonaStates = { ...state.personaStates }

      for (const p of snap.personas) {
        if (!existingIds.has(p.id)) {
          existingIds.add(p.id)
          newPersonas.push({
            id: p.id,
            name: p.name,
            age: p.age,
            occupation: p.occupation,
            annualIncome: p.annualIncome,
            priceSensitivity: p.priceSensitivity,
            dietaryRestrictions: p.dietaryRestrictions,
          })
        }

        if (p.sentiment !== null) {
          newPersonaStates[p.id] = {
            sentiment: p.sentiment,
            feedback: p.feedback,
            wouldVisit: p.wouldVisit,
            likelyOrder: p.likelyOrder,
          }
        }
      }

      return {
        ...state,
        phase: snap.phase,
        strategy: snap.strategy ?? state.strategy,
        personas: newPersonas,
        personaStates: newPersonaStates,
        stats: snap.stats ?? state.stats,
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

// ──────────────────────────────── Hook ───────────────────────────────

export function useSimulation() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [mockMode, setMockMode] = useState(true)
  const cleanupRef = useRef(null)
  // Use a ref so the start callback always sees the current mockMode
  const mockModeRef = useRef(mockMode)
  mockModeRef.current = mockMode

  const start = useCallback((concept, location) => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

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

  return { state, mockMode, setMockMode, start, stop }
}
