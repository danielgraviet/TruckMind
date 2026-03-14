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
  connectShopStream,
  normalizeAction,
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
  streamConnected: false,
  channelSending: {
    walk_up: false,
    text_order: false,
    escalation: false,
  },
}

function mergeRecentById(existing = [], incoming = [], limit = 10) {
  const merged = [...existing]
  for (const item of incoming) {
    if (!item) continue
    const id = item.id ?? `${item.timestamp}-${item.type ?? item.action_type ?? 'item'}`
    const idx = merged.findIndex((candidate) => (candidate.id ?? '') === id)
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...item }
    } else {
      merged.push({ ...item, id })
    }
  }
  return merged.slice(-limit)
}

function appendChannelMessage(existing = [], incoming) {
  if (!incoming) return existing

  const duplicate = existing.some((candidate) => (
    candidate.role === incoming.role &&
    candidate.channel === incoming.channel &&
    candidate.text === incoming.text &&
    Math.abs(new Date(candidate.timestamp).getTime() - new Date(incoming.timestamp).getTime()) < 3000
  ))

  if (duplicate) return existing
  return [...existing, incoming]
}

function pickRandom(items = []) {
  if (!items.length) return 'today\'s special'
  return items[Math.floor(Math.random() * items.length)]
}

function liveEventFromAction(action, fallbackChannel = 'operations') {
  return {
    type: action.type === 'adjust_price' ? 'pricing' : action.type,
    channel: action.channel ?? fallbackChannel,
    text: action.description,
    details: action.details,
    timestamp: action.timestamp ?? new Date().toISOString(),
  }
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

    case 'UPSERT_ACTIONS': {
      if (!state.shopState) return state
      return {
        ...state,
        shopState: {
          ...state.shopState,
          recentActions: mergeRecentById(state.shopState.recentActions, action.payload, 10),
        },
      }
    }

    case 'SET_RULES':
      return { ...state, rules: action.payload }

    case 'ADD_LIVE_EVENT':
      return { ...state, liveEvents: [action.payload, ...state.liveEvents].slice(0, 100) }

    case 'ADD_CHANNEL_MESSAGE': {
      const { channel, message } = action.payload
      const channelKey = channel === 'walk_up' ? 'walkUpMessages'
                       : channel === 'text_order' ? 'textMessages'
                       : 'escalationMessages'
      return { ...state, [channelKey]: appendChannelMessage(state[channelKey], message) }
    }

    case 'START_RUSH':
      return { ...state, rushMode: true, rushCountdown: 60, isRushing: true }

    case 'TICK_RUSH':
      if (state.rushCountdown <= 1) return { ...state, rushMode: false, rushCountdown: 0, isRushing: false }
      return { ...state, rushCountdown: state.rushCountdown - 1 }

    case 'SET_TRICKLE':
      return { ...state, customerTrickle: action.payload }

    case 'SET_STREAM_CONNECTED':
      return { ...state, streamConnected: action.payload }

    case 'SET_CHANNEL_SENDING':
      return {
        ...state,
        channelSending: {
          ...state.channelSending,
          [action.payload.channel]: action.payload.value,
        },
      }

    case 'UPSERT_ORDERS': {
      if (!state.shopState) return state
      return {
        ...state,
        shopState: {
          ...state.shopState,
          recentOrders: mergeRecentById(state.shopState.recentOrders, action.payload, 10),
        },
      }
    }

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

  useEffect(() => {
    if (state.isLoading || state.mockMode) return undefined

    const disconnect = connectShopStream({
      onState: (shopState) => {
        dispatch({ type: 'SHOP_UPDATE', payload: shopState })
        dispatch({ type: 'SET_STREAM_CONNECTED', payload: true })
      },
      onCustomerMessage: (message) => {
        dispatch({
          type: 'ADD_CHANNEL_MESSAGE',
          payload: {
            channel: message.channel ?? 'walk_up',
            message: {
              id: `customer-${message.timestamp}-${message.customer_name ?? 'guest'}`,
              role: 'customer',
              text: message.text,
              channel: message.channel ?? 'walk_up',
              timestamp: message.timestamp ?? new Date().toISOString(),
            },
          },
        })
        dispatch({
          type: 'ADD_LIVE_EVENT',
          payload: {
            type: 'customer_arrival',
            channel: message.channel ?? 'walk_up',
            text: `${message.customer_name ?? 'Customer'}: ${message.text}`,
            timestamp: message.timestamp ?? new Date().toISOString(),
          },
        })
      },
      onCashierMessage: (message) => {
        dispatch({
          type: 'ADD_CHANNEL_MESSAGE',
          payload: {
            channel: message.channel ?? 'walk_up',
            message: {
              id: `cashier-${message.timestamp}-${message.customer_name ?? 'guest'}`,
              role: 'cashier',
              text: message.text,
              channel: message.channel ?? 'walk_up',
              timestamp: message.timestamp ?? new Date().toISOString(),
            },
          },
        })
      },
      onAction: (rawAction) => {
        const action = normalizeAction(rawAction)
        dispatch({ type: 'UPSERT_ACTIONS', payload: [action] })
        dispatch({ type: 'ADD_LIVE_EVENT', payload: liveEventFromAction(action) })
      },
      onOrder: (order) => {
        if (order) {
          dispatch({ type: 'UPSERT_ORDERS', payload: [order] })
        }
      },
      onError: () => {
        dispatch({ type: 'SET_STREAM_CONNECTED', payload: false })
      },
    })

    return () => {
      dispatch({ type: 'SET_STREAM_CONNECTED', payload: false })
      disconnect?.()
    }
  }, [state.isLoading, state.mockMode])

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
    const customerName = channel === 'text_order' ? 'SMS Customer' : 'Walk-up Customer'

    try {
      dispatch({ type: 'SET_CHANNEL_SENDING', payload: { channel, value: true } })

      if (cur.mockMode) {
        const customerMsg = { id: Date.now(), role: 'customer', text, channel, timestamp: now }
        dispatch({ type: 'ADD_CHANNEL_MESSAGE', payload: { channel, message: customerMsg } })
        dispatch({ type: 'ADD_LIVE_EVENT', payload: { type: 'order', channel, text, timestamp: now } })

        const response = channel === 'escalation'
          ? await sendChannelOrder(channel, text)
          : (() => {
              const result = mockSendOrder(cur.shopState, text, {
                channel,
                customerName,
              })
              return {
                reply: result.cashierReply,
                shopState: result.shopState,
                actions: result.actions,
              }
            })()

        const cashierMsg = {
          id: Date.now() + 1,
          role: 'cashier',
          text: response.reply,
          channel,
          timestamp: new Date().toISOString(),
        }
        dispatch({ type: 'ADD_CHANNEL_MESSAGE', payload: { channel, message: cashierMsg } })
        if (response.shopState) dispatch({ type: 'SHOP_UPDATE', payload: response.shopState })
        if (response.actions?.length) {
          dispatch({ type: 'UPSERT_ACTIONS', payload: response.actions })
          response.actions.forEach((action) => dispatch({
            type: 'ADD_LIVE_EVENT',
            payload: liveEventFromAction(action, channel),
          }))
        }
      } else {
        const customerMsg = { id: `pending-${Date.now()}`, role: 'customer', text, channel, timestamp: now }
        dispatch({ type: 'ADD_CHANNEL_MESSAGE', payload: { channel, message: customerMsg } })
        dispatch({ type: 'ADD_LIVE_EVENT', payload: { type: 'order', channel, text, timestamp: now } })

        const response = await sendChannelOrder(channel, text)

        dispatch({
          type: 'ADD_CHANNEL_MESSAGE',
          payload: {
            channel,
            message: {
              id: `reply-${Date.now()}`,
              role: 'cashier',
              text: response.reply,
              channel,
              timestamp: new Date().toISOString(),
            },
          },
        })
        if (response.shopState) dispatch({ type: 'SHOP_UPDATE', payload: response.shopState })
        if (response.actions?.length) {
          dispatch({ type: 'UPSERT_ACTIONS', payload: response.actions })
          response.actions.forEach((action) => dispatch({
            type: 'ADD_LIVE_EVENT',
            payload: liveEventFromAction(action, channel),
          }))
        }
      }
    } catch {
      dispatch({
        type: 'ADD_CHANNEL_MESSAGE',
        payload: {
          channel,
          message: {
            id: `error-${Date.now()}`,
            role: 'cashier',
            text: 'Order delayed. Try again in a moment.',
            channel,
            timestamp: new Date().toISOString(),
          },
        },
      })
    } finally {
      dispatch({ type: 'SET_CHANNEL_SENDING', payload: { channel, value: false } })
    }
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

    let active = true

    function scheduleNext() {
      const base = stateRef.current.rushMode ? [3000, 5000] : [8000, 12000]
      const delay = base[0] + Math.random() * (base[1] - base[0])
      trickleRef.current = setTimeout(async () => {
        if (!active) return
        const now = new Date().toISOString()
        if (!stateRef.current.mockMode) {
          try {
            await triggerScenario('next_customer')
          } catch { /* ignore */ }
        } else {
          const channels = ['walk_up', 'walk_up', 'walk_up', 'text_order', 'text_order', 'escalation']
          const channel = channels[Math.floor(Math.random() * channels.length)]
          const names = ["Alex S.", "Jordan M.", "Taylor B.", "Morgan W.", "Casey J.", "Riley G."]
          const name = names[Math.floor(Math.random() * names.length)]
          const text = channel === 'escalation'
            ? "The price looked different than last time. Can someone explain?"
            : channel === 'text_order'
              ? `Hi, can I order ${pickRandom(stateRef.current.shopState?.activeMenu ?? ["today's special"])}?`
              : `Can I get ${pickRandom(stateRef.current.shopState?.activeMenu ?? ["today's special"])}?`
          const customerMessage = {
            id: `${now}-${name}-customer`,
            role: 'customer',
            text,
            channel,
            timestamp: now,
          }
          dispatch({ type: 'ADD_CHANNEL_MESSAGE', payload: { channel, message: customerMessage } })
          dispatch({ type: 'ADD_LIVE_EVENT', payload: {
            type: 'customer_arrival',
            channel,
            text: `${name} arrived (${channel.replace('_', '-')})`,
            timestamp: now,
          }})
          const cur = stateRef.current
          if (cur.shopState) {
            const response = channel === 'escalation'
              ? await sendChannelOrder(channel, text)
              : (() => {
                  const result = mockSendOrder(cur.shopState, text, {
                    channel,
                    customerName: name,
                  })
                  return {
                    reply: result.cashierReply,
                    shopState: result.shopState,
                    actions: result.actions,
                  }
                })()

            dispatch({
              type: 'ADD_CHANNEL_MESSAGE',
              payload: {
                channel,
                message: {
                  id: `${now}-${name}-cashier`,
                  role: 'cashier',
                  text: response.reply,
                  channel,
                  timestamp: new Date().toISOString(),
                },
              },
            })
            if (response.shopState) dispatch({ type: 'SHOP_UPDATE', payload: response.shopState })
            if (response.actions?.length) {
              dispatch({ type: 'UPSERT_ACTIONS', payload: response.actions })
              response.actions.forEach((action) => dispatch({
                type: 'ADD_LIVE_EVENT',
                payload: liveEventFromAction(action, channel),
              }))
            }
          }
        }
        if (active) scheduleNext()
      }, delay)
    }

    scheduleNext()
    return () => {
      active = false
      clearTimeout(trickleRef.current)
    }
  }, [state.customerTrickle])

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
    streamConnected: state.streamConnected,
    channelSending: state.channelSending,
  }
}
