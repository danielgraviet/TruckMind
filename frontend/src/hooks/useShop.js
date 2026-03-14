import { useReducer, useCallback, useRef, useEffect } from 'react'
import {
  fetchShopState,
  sendOrder,
  triggerRush,
  buildMockShopState,
  mockSendOrder,
  mockSimulateRush,
} from '../api/shopApi.js'

// ─────────────────────────── State shape ─────────────────────────────
// {
//   shopState: null | { activeMenu, inventory, currentPrices, recentOrders,
//                       recentActions, removedItems, totalRevenue, totalOrders, cashOnHand }
//   messages:  [{ id, role: 'customer'|'cashier', text, timestamp }]
//   isLoading: boolean
//   isRushing: boolean
//   isSending: boolean
//   mockMode:  boolean
// }

const initialState = {
  shopState: null,
  messages: [],
  isLoading: true,
  isRushing: false,
  isSending: false,
  mockMode: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        shopState: action.payload.shopState,
        mockMode: action.payload.mockMode,
        isLoading: false,
      }

    case 'SEND_START':
      return { ...state, isSending: true }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      }

    case 'ORDER_RESPONSE': {
      const { shopState, cashierReply, actions } = action.payload
      const now = Date.now()
      const updatedShop = actions?.length
        ? { ...shopState, recentActions: [...(shopState.recentActions ?? []), ...actions] }
        : shopState
      return {
        ...state,
        shopState: updatedShop,
        isSending: false,
        messages: [
          ...state.messages,
          { id: `msg-${now}-reply`, role: 'cashier', text: cashierReply, timestamp: now },
        ],
      }
    }

    case 'RUSH_START':
      return { ...state, isRushing: true }

    case 'RUSH_EVENT': {
      const { shopState, messages: newMsgs, actions } = action.payload
      return {
        ...state,
        shopState: {
          ...shopState,
          recentActions: [
            ...(state.shopState?.recentActions ?? []),
            ...(actions ?? []),
          ],
        },
        messages: [...state.messages, ...(newMsgs ?? [])],
      }
    }

    case 'RUSH_DONE':
      return {
        ...state,
        isRushing: false,
        shopState: action.payload?.shopState
          ? {
              ...action.payload.shopState,
              recentActions: state.shopState?.recentActions ?? [],
            }
          : state.shopState,
      }

    default:
      return state
  }
}

// ──────────────────────────────── Hook ───────────────────────────────

export function useShop(strategy) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const rushCleanupRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // Initialize: try live API, fall back to mock
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const data = await fetchShopState()
        if (!cancelled) {
          dispatch({ type: 'INIT', payload: { shopState: data, mockMode: false } })
        }
      } catch {
        if (!cancelled && strategy) {
          const mock = buildMockShopState(strategy)
          dispatch({ type: 'INIT', payload: { shopState: mock, mockMode: true } })
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [strategy])

  const sendMessage = useCallback(async (text) => {
    const cur = stateRef.current
    if (!cur.shopState) return

    const now = Date.now()
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: `msg-${now}`, role: 'customer', text, timestamp: now },
    })
    dispatch({ type: 'SEND_START' })

    if (cur.mockMode) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400))
      const result = mockSendOrder(cur.shopState, text)
      dispatch({ type: 'ORDER_RESPONSE', payload: result })
    } else {
      try {
        const result = await sendOrder(text)
        dispatch({ type: 'ORDER_RESPONSE', payload: result })
      } catch (err) {
        console.error('[useShop] order error:', err)
        dispatch({
          type: 'ORDER_RESPONSE',
          payload: {
            shopState: cur.shopState,
            cashierReply: 'Sorry, something went wrong. Try again?',
            actions: [],
          },
        })
      }
    }
  }, [])

  const simulateRush = useCallback(async () => {
    const cur = stateRef.current
    if (!cur.shopState || cur.isRushing) return

    if (rushCleanupRef.current) {
      rushCleanupRef.current()
      rushCleanupRef.current = null
    }

    dispatch({ type: 'RUSH_START' })

    if (cur.mockMode) {
      rushCleanupRef.current = mockSimulateRush(cur.shopState, (event) => {
        if (event.done) {
          dispatch({ type: 'RUSH_DONE', payload: event })
        } else {
          dispatch({ type: 'RUSH_EVENT', payload: event })
        }
      })
    } else {
      try {
        const result = await triggerRush()
        dispatch({ type: 'RUSH_DONE', payload: result })
      } catch (err) {
        console.error('[useShop] rush error:', err)
        dispatch({ type: 'RUSH_DONE', payload: {} })
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (rushCleanupRef.current) rushCleanupRef.current()
    }
  }, [])

  return {
    shopState: state.shopState,
    messages: state.messages,
    isLoading: state.isLoading,
    isRushing: state.isRushing,
    isSending: state.isSending,
    mockMode: state.mockMode,
    sendMessage,
    simulateRush,
  }
}
