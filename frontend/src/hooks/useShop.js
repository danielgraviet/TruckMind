import { useReducer, useCallback, useRef, useEffect } from 'react'
import {
  fetchShopState,
  sendOrder,
  triggerRush,
  buildMockShopState,
  mockSendOrder,
  mockSimulateRush,
  fetchRules,
  updateRules,
  sendChannelOrder,
  triggerScenario,
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
//   rules:     null | object
//   liveEvents: [{ type, text, channel?, timestamp }]
//   walkUpMessages: [{ id, role, text, channel, timestamp }]
//   textMessages: [{ id, role, text, channel, timestamp }]
//   escalationMessages: [{ id, role, text, channel, timestamp }]
//   customerTrickle: boolean
//   rushMode: boolean
//   rushCountdown: number
// }

const initialState = {
  shopState: null,
  messages: [],
  isLoading: true,
  isRushing: false,
  isSending: false,
  mockMode: false,
  rules: null,
  liveEvents: [],
  walkUpMessages: [],
  textMessages: [],
  escalationMessages: [],
  customerTrickle: false,
  rushMode: false,
  rushCountdown: 0,
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

    case 'SHOP_UPDATE':
      return { ...state, shopState: action.payload }

    case 'SET_RULES':
      return { ...state, rules: action.payload }

    case 'ADD_LIVE_EVENT':
      return { ...state, liveEvents: [action.payload, ...state.liveEvents].slice(0, 100) }

    case 'ADD_CHANNEL_MESSAGE': {
      const { channel, message } = action.payload
      const channelKey = channel === 'walk_up' ? 'walkUpMessages'
                       : channel === 'text_order' ? 'textMessages'
                       : 'escalationMessages'
      return { ...state, [channelKey]: [...state[channelKey], message] }
    }

    case 'START_RUSH':
      return { ...state, rushMode: true, rushCountdown: 60, isRushing: true }

    case 'TICK_RUSH':
      if (state.rushCountdown <= 1) return { ...state, rushMode: false, rushCountdown: 0, isRushing: false }
      return { ...state, rushCountdown: state.rushCountdown - 1 }

    case 'SET_TRICKLE':
      return { ...state, customerTrickle: action.payload }

    default:
      return state
  }
}

// ──────────────────────────────── Hook ───────────────────────────────

export function useShop(strategy, forceMock = false) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const rushCleanupRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const trickleRef = useRef(null)

  const mockMode = state.mockMode

  // Initialize: skip live API when forceMock, otherwise try live and fall back to mock
  useEffect(() => {
    let cancelled = false

    async function init() {
      if (forceMock) {
        if (strategy) {
          const mock = buildMockShopState(strategy)
          if (!cancelled) dispatch({ type: 'INIT', payload: { shopState: mock, mockMode: true } })
        }
        return
      }
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

    init().then(() => {
      if (!cancelled) dispatch({ type: 'SET_TRICKLE', payload: true })
    })
    return () => { cancelled = true }
  }, [strategy, forceMock])

  // Load rules on mount
  const loadRules = useCallback(async () => {
    try {
      const r = await fetchRules()
      dispatch({ type: 'SET_RULES', payload: r })
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  // Save rules to API
  const saveRules = useCallback(async (newRules) => {
    try {
      const r = await updateRules(newRules)
      dispatch({ type: 'SET_RULES', payload: r })
    } catch { /* ignore */ }
  }, [])

  // Send message on specific channel
  const handleChannelMessage = useCallback(async (channel, text) => {
    if (!text.trim()) return
    const now = new Date().toISOString()
    const cur = stateRef.current
    const customerMsg = { id: Date.now(), role: 'customer', text, channel, timestamp: now }
    dispatch({ type: 'ADD_CHANNEL_MESSAGE', payload: { channel, message: customerMsg } })
    dispatch({ type: 'ADD_LIVE_EVENT', payload: { type: 'order', channel, text, timestamp: now } })

    try {
      const response = cur.mockMode && cur.shopState && channel !== 'escalation'
        ? (() => {
            const result = mockSendOrder(cur.shopState, text, {
              channel,
              customerName: channel === 'text_order' ? 'SMS Customer' : 'Walk-up Customer',
            })
            return {
              reply: result.cashierReply,
              shopState: result.shopState,
              actions: result.actions,
            }
          })()
        : await sendChannelOrder(channel, text)
      const cashierMsg = { id: Date.now() + 1, role: 'cashier', text: response.reply, channel, timestamp: new Date().toISOString() }
      dispatch({ type: 'ADD_CHANNEL_MESSAGE', payload: { channel, message: cashierMsg } })
      if (response.shopState) dispatch({ type: 'SHOP_UPDATE', payload: response.shopState })
      if (response.actions?.length) {
        response.actions.forEach(a => dispatch({
          type: 'ADD_LIVE_EVENT',
          payload: {
            type: a.type === 'adjust_price' ? 'pricing' : a.type,
            channel,
            text: a.description,
            details: a.details,
            timestamp: a.timestamp ?? new Date().toISOString(),
          },
        }))
      }
    } catch { /* ignore */ }
  }, [])

  // Customer trickle - in demo mode, auto-generate customers
  const startTrickle = useCallback(() => {
    dispatch({ type: 'SET_TRICKLE', payload: true })
  }, [])

  // Rush: start rush mode (4x trickle for 60 seconds)
  const startRush = useCallback(async () => {
    const cur = stateRef.current
    if (!cur.shopState || cur.isRushing) return

    dispatch({ type: 'START_RUSH' })
    dispatch({ type: 'ADD_LIVE_EVENT', payload: { type: 'rush', text: 'RUSH MODE ACTIVATED', timestamp: new Date().toISOString() } })
    if (cur.mockMode) {
      if (rushCleanupRef.current) {
        rushCleanupRef.current()
        rushCleanupRef.current = null
      }
      rushCleanupRef.current = mockSimulateRush(cur.shopState, (event) => {
        if (event.done) {
          dispatch({ type: 'RUSH_DONE', payload: event })
        } else {
          dispatch({ type: 'RUSH_EVENT', payload: event })
        }
      })
    } else {
      try { await triggerScenario('rush') } catch { /* ignore */ }
    }
  }, [])

  // Customer trickle effect
  useEffect(() => {
    if (!state.customerTrickle) {
      clearTimeout(trickleRef.current)
      return
    }

    function scheduleNext() {
      const base = state.rushMode ? [3000, 5000] : [8000, 12000]
      const delay = base[0] + Math.random() * (base[1] - base[0])
      trickleRef.current = setTimeout(async () => {
        if (!stateRef.current.mockMode) {
          // In live mode, call API to generate next customer
          try {
            const result = await triggerScenario('next_customer')
            if (result?.event) dispatch({ type: 'ADD_LIVE_EVENT', payload: result.event })
          } catch { /* ignore */ }
        } else {
          // In demo mode, generate a synthetic customer + place an order
          const channels = ['walk_up', 'walk_up', 'walk_up', 'text_order', 'text_order', 'escalation']
          const channel = channels[Math.floor(Math.random() * channels.length)]
          const names = ["Alex S.", "Jordan M.", "Taylor B.", "Morgan W.", "Casey J.", "Riley G."]
          const name = names[Math.floor(Math.random() * names.length)]
          const now = new Date().toISOString()
          dispatch({ type: 'ADD_LIVE_EVENT', payload: {
            type: 'customer_arrival',
            channel,
            text: `${name} arrived (${channel.replace('_', '-')})`,
            timestamp: now,
          }})
          // Auto-place an order from this customer
          const cur = stateRef.current
          if (cur.shopState) {
            const available = cur.shopState.activeMenu.filter(
              n => !cur.shopState.removedItems?.includes(n) && (cur.shopState.inventory[n]?.quantity ?? 0) > 0
            )
            if (available.length > 0) {
              const item = available[Math.floor(Math.random() * available.length)]
              const result = mockSendOrder(cur.shopState, `Can I get a ${item}?`, {
                channel,
                customerName: name,
              })
              dispatch({ type: 'SHOP_UPDATE', payload: result.shopState })
              if (result.actions?.length) {
                result.actions.forEach(a => dispatch({
                  type: 'ADD_LIVE_EVENT',
                  payload: {
                    type: a.type === 'adjust_price' ? 'pricing' : a.type,
                    channel,
                    text: a.description,
                    details: a.details,
                    timestamp: a.timestamp ?? now,
                  },
                }))
              }
            }
          }
        }
        scheduleNext()
      }, delay)
    }

    scheduleNext()
    return () => clearTimeout(trickleRef.current)
  }, [state.customerTrickle, state.rushMode])

  // Rush countdown
  useEffect(() => {
    if (!state.rushMode) return
    const interval = setInterval(() => dispatch({ type: 'TICK_RUSH' }), 1000)
    return () => clearInterval(interval)
  }, [state.rushMode])

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
    // New exports
    rules: state.rules,
    liveEvents: state.liveEvents,
    walkUpMessages: state.walkUpMessages,
    textMessages: state.textMessages,
    escalationMessages: state.escalationMessages,
    rushMode: state.rushMode,
    rushCountdown: state.rushCountdown,
    customerTrickle: state.customerTrickle,
    loadRules,
    saveRules,
    handleChannelMessage,
    startTrickle,
    startRush,
  }
}
