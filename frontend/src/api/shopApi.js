import { DEFAULT_RULES } from '../components/shop/RulesForm.jsx'

// ─────────────────────────── Normalize backend → frontend ─────────────

let _normActionId = 1000
let _normOrderId = 1000

function stringifyDetails(details) {
  if (details == null) return ''
  if (typeof details === 'string') return details
  if (typeof details !== 'object') return String(details)
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ')
}

function normalizeOrder(raw, fallback = {}) {
  if (!raw) return null

  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : raw.item
      ? [raw.item]
      : []

  const items = rawItems.map((item) => {
    if (typeof item === 'string') return { name: item }
    return {
      name: item.name ?? item.item ?? 'Item',
      price: item.price ?? item.total_price ?? item.total ?? null,
    }
  })

  return {
    id: raw.id ?? `order-${_normOrderId++}`,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    customerName: raw.customerName ?? raw.customer_name ?? fallback.customerName ?? 'Customer',
    channel: raw.channel ?? fallback.channel,
    items,
    total: raw.total ?? raw.total_price ?? raw.price ?? fallback.total ?? 0,
    status: raw.status ?? fallback.status ?? 'pending',
  }
}

export function normalizeAction(raw) {
  const action = raw?.action ?? raw
  const type = action?.action_type ?? action?.type ?? 'update_status'
  return {
    id: action?.id ?? `action-${_normActionId++}`,
    type,
    action_type: type,
    description: action?.description ?? '',
    details: action?.details ?? {},
    detailsText: stringifyDetails(action?.details),
    timestamp: raw?.timestamp ?? action?.timestamp ?? new Date().toISOString(),
    autonomous: action?.autonomous ?? true,
    context_gathered: action?.context_gathered ?? [],
    options_considered: action?.options_considered ?? [],
    reasoning: action?.reasoning ?? '',
    confidence: action?.confidence ?? 1,
    escalated: action?.escalated ?? false,
    channel: action?.channel ?? raw?.channel ?? 'operations',
  }
}

export function normalizeShopState(raw) {
  if (!raw) return null

  const inventory = {}
  if (Array.isArray(raw.inventory)) {
    for (const item of raw.inventory) {
      inventory[item.menu_item_name] = {
        quantity: item.quantity_remaining,
        maxCapacity: item.max_capacity,
        unitCost: item.unit_cost,
        isLow: item.is_low,
        isOut: item.is_out,
        restockThreshold: item.restock_threshold,
      }
    }
  } else if (raw.inventory && typeof raw.inventory === 'object') {
    Object.assign(inventory, raw.inventory)
  }

  let activeMenu = []
  let activeMenuItems = []
  if (Array.isArray(raw.active_menu)) {
    activeMenuItems = raw.active_menu.map(item =>
      typeof item === 'string' ? { name: item } : item
    )
    activeMenu = activeMenuItems.map(item => item.name)
  } else if (Array.isArray(raw.activeMenu)) {
    activeMenu = raw.activeMenu
    activeMenuItems = raw.activeMenuItems ?? raw.activeMenu.map(name => ({ name }))
  }

  const overrides = raw.current_prices ?? raw.currentPrices ?? {}
  const currentPrices = { ...overrides }
  for (const item of activeMenuItems) {
    if (item?.name && !(item.name in currentPrices)) {
      currentPrices[item.name] = item.base_price ?? item.basePrice ?? 0
    }
  }

  const rawKpis = raw.kpis ?? {}

  return {
    activeMenu,
    activeMenuItems,
    inventory,
    currentPrices,
    recentOrders: (raw.recent_orders ?? raw.recentOrders ?? [])
      .map(order => normalizeOrder(order))
      .filter(Boolean),
    recentActions: (raw.recent_actions ?? raw.recentActions ?? []).map(normalizeAction),
    removedItems: raw.removed_items ?? raw.removedItems ?? [],
    totalRevenue: raw.total_revenue ?? raw.totalRevenue ?? 0,
    totalCogs: raw.total_cogs ?? raw.totalCogs ?? 0,
    grossProfit: raw.gross_profit ?? raw.grossProfit ?? 0,
    totalOrders: raw.total_orders ?? raw.totalOrders ?? 0,
    cashOnHand: raw.cash_on_hand ?? raw.cashOnHand ?? 500,
    kpis: {
      avgOrderValue: rawKpis.avg_order_value ?? rawKpis.avgOrderValue ?? 0,
      foodCostPct: rawKpis.food_cost_pct ?? rawKpis.foodCostPct ?? 0,
      grossMarginPct: rawKpis.gross_margin_pct ?? rawKpis.grossMarginPct ?? 0,
      inventoryValueOnHand: rawKpis.inventory_value_on_hand ?? rawKpis.inventoryValueOnHand ?? 0,
      inventoryUnitsRemaining: rawKpis.inventory_units_remaining ?? rawKpis.inventoryUnitsRemaining ?? 0,
      lowStockItems: rawKpis.low_stock_items ?? rawKpis.lowStockItems ?? 0,
      outOfStockItems: rawKpis.out_of_stock_items ?? rawKpis.outOfStockItems ?? 0,
      autonomousActions: rawKpis.autonomous_actions ?? rawKpis.autonomousActions ?? 0,
      pricingActions: rawKpis.pricing_actions ?? rawKpis.pricingActions ?? 0,
      restocks: rawKpis.restocks ?? 0,
      escalations: rawKpis.escalations ?? 0,
    },
    rules: raw.rules ?? raw.shopRules ?? null,
  }
}

export function connectShopStream(handlers = {}) {
  const stream = new EventSource(`${API_BASE}/shop/stream`)

  stream.addEventListener('shop_state', (event) => {
    handlers.onState?.(normalizeShopState(JSON.parse(event.data)))
  })
  stream.addEventListener('customer_message', (event) => {
    handlers.onCustomerMessage?.(JSON.parse(event.data))
  })
  stream.addEventListener('cashier_message', (event) => {
    handlers.onCashierMessage?.(JSON.parse(event.data))
  })
  stream.addEventListener('shop_action', (event) => {
    handlers.onAction?.(normalizeAction(JSON.parse(event.data)))
  })
  stream.addEventListener('order', (event) => {
    const payload = JSON.parse(event.data)
    handlers.onOrder?.(normalizeOrder(payload.order, {
      channel: payload.channel,
      customerName: payload.customer_name,
    }))
  })
  stream.onerror = (error) => {
    handlers.onError?.(error)
  }

  return () => {
    stream.close()
  }
}

// ─────────────────────────── Config ───────────────────────────────────

const API_BASE = '/api'
const MOCK_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === '1'

// ─────────────────────────── Live API calls ───────────────────────────

export async function fetchShopState() {
  const res = await fetch(`${API_BASE}/shop/state`)
  if (!res.ok) throw new Error(`Shop state fetch failed: ${res.status}`)
  const raw = await res.json()
  return normalizeShopState(raw)
}

export async function sendOrder(message, customerName = 'Customer') {
  const res = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, customer_name: customerName }),
  })
  if (!res.ok) throw new Error(`Order failed: ${res.status}`)
  const raw = await res.json()

  // Map backend field names to what the reducer expects
  const actions = (raw.autonomous_actions ?? []).map(normalizeAction)

  return {
    shopState: normalizeShopState(raw.shop_state),
    cashierReply: raw.cashier_message,
    actions,
  }
}

export async function triggerRush() {
  const res = await fetch(`${API_BASE}/shop/simulate-rush`, { method: 'POST' })
  if (!res.ok) throw new Error(`Rush trigger failed: ${res.status}`)
  const raw = await res.json()

  return {
    shopState: normalizeShopState(raw.shop_state),
  }
}

// ─────────────────────────── New API calls ────────────────────────────

// Fetch current rules
export async function fetchRules() {
  if (MOCK_MODE) return getMockRules()
  const res = await fetch(`${API_BASE}/shop/rules`)
  if (!res.ok) throw new Error('Failed to fetch rules')
  const raw = await res.json()
  return raw.rules ?? raw
}

// Update rules
export async function updateRules(rules) {
  if (MOCK_MODE) return rules
  const res = await fetch(`${API_BASE}/shop/rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  })
  if (!res.ok) throw new Error('Failed to update rules')
  const raw = await res.json()
  return raw.rules ?? raw
}

// Send order on specific channel
export async function sendChannelOrder(channel, message) {
  if (MOCK_MODE) return mockChannelOrder(channel, message)
  const res = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, message }),
  })
  if (!res.ok) throw new Error('Failed to send order')
  const raw = await res.json()
  return {
    reply: raw.cashier_message,
    shopState: normalizeShopState(raw.shop_state),
    actions: (raw.autonomous_actions ?? []).map(normalizeAction),
  }
}

// Trigger a scenario
export async function triggerScenario(scenario) {
  if (MOCK_MODE) return mockTriggerScenario(scenario)
  const res = await fetch(`${API_BASE}/shop/trigger-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  })
  if (!res.ok) throw new Error('Failed to trigger scenario')
  return res.json()
}

// ─────────────────────────── New mock helpers ─────────────────────────

function getMockRules() {
  return { ...DEFAULT_RULES }
}

function mockChannelOrder(channel, message) {
  const replies = {
    walk_up: "Got it! Coming right up in about 5 minutes!",
    text_order: "Order received! Estimated wait: 10-12 minutes. We'll text when ready.",
    escalation: "I'm so sorry for the inconvenience. Let me make this right for you.",
  }
  return {
    reply: replies[channel] ?? "Order received!",
    shopState: null,
    actions: [],
  }
}

function mockTriggerScenario(scenario) {
  if (scenario === 'rush') return { success: true, event: { type: 'rush', text: 'Rush triggered' } }
  if (scenario === 'next_customer') return { success: true, event: null }
  return { success: true }
}

// ─────────────────────────── Mock helpers ──────────────────────────────

const CATEGORY_CAPACITY = { tacos: 10, bowls: 8, mains: 8, sides: 12, drinks: 15, desserts: 6 }

let _actionId = 0
function nextActionId() { return `action-${++_actionId}` }

function buildMockAction({
  type,
  description,
  details = {},
  timestamp = Date.now(),
  confidence = 0.82,
  reasoning = '',
  channel = 'operations',
  escalated = false,
}) {
  return {
    id: nextActionId(),
    type,
    action_type: type,
    description,
    details,
    detailsText: stringifyDetails(details),
    timestamp,
    confidence,
    reasoning,
    channel,
    escalated,
    autonomous: type !== 'take_order',
    context_gathered: [],
    options_considered: [],
  }
}

function decorateMockState(state) {
  const inventoryEntries = Object.values(state.inventory ?? {})
  const totalRevenue = state.totalRevenue ?? 0
  const totalCogs = state.totalCogs ?? 0
  const grossProfit = totalRevenue - totalCogs
  const totalOrders = state.totalOrders ?? 0
  const inventoryValueOnHand = inventoryEntries.reduce(
    (sum, item) => sum + ((item.quantity ?? 0) * (item.unitCost ?? 0)),
    0,
  )
  const inventoryUnitsRemaining = inventoryEntries.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
  const lowStockItems = inventoryEntries.filter((item) => (item.quantity ?? 0) > 0 && (item.quantity ?? 0) <= (item.restockThreshold ?? 2)).length
  const outOfStockItems = inventoryEntries.filter((item) => (item.quantity ?? 0) <= 0).length
  const actionStats = state.actionStats ?? {}

  return {
    ...state,
    grossProfit,
    kpis: {
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      foodCostPct: totalRevenue > 0 ? totalCogs / totalRevenue : 0,
      grossMarginPct: totalRevenue > 0 ? grossProfit / totalRevenue : 0,
      inventoryValueOnHand,
      inventoryUnitsRemaining,
      lowStockItems,
      outOfStockItems,
      autonomousActions: actionStats.autonomousActions ?? 0,
      pricingActions: actionStats.pricingActions ?? 0,
      restocks: actionStats.restocks ?? 0,
      escalations: actionStats.escalations ?? 0,
    },
  }
}

export function buildMockShopState(strategy) {
  if (!strategy?.menu?.length) return null

  const inventory = {}
  const currentPrices = {}
  const menuMeta = {}

  for (const item of strategy.menu) {
    const cap = CATEGORY_CAPACITY[item.category] ?? 10
    inventory[item.name] = {
      quantity: cap,
      maxCapacity: cap,
      unitCost: item.cost_to_make,
      isLow: false,
      isOut: false,
      restockThreshold: Math.max(2, Math.round(cap * 0.25)),
    }
    currentPrices[item.name] = item.base_price
    menuMeta[item.name] = {
      basePrice: item.base_price,
      costToMake: item.cost_to_make,
      category: item.category,
    }
  }

  return decorateMockState({
    activeMenu: strategy.menu.map(i => i.name),
    activeMenuItems: strategy.menu,
    inventory,
    currentPrices,
    recentOrders: [],
    recentActions: [],
    removedItems: [],
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    totalOrders: 0,
    cashOnHand: 500,
    menuMeta,
    salesByItem: {},
    actionStats: {
      autonomousActions: 0,
      pricingActions: 0,
      restocks: 0,
      escalations: 0,
    },
  })
}

// ─────────────────── Mock order processing ────────────────────────────

const CUSTOMER_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Jackson', 'Sophia', 'Lucas',
  'Isabella', 'Oliver', 'Mia', 'Ethan', 'Charlotte', 'Aiden', 'Amelia',
]

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function findMenuItem(shopState, message) {
  const lower = message.toLowerCase()
  return shopState.activeMenu.find(name =>
    lower.includes(name.toLowerCase()) ||
    name.toLowerCase().split(' ').some(word => word.length > 3 && lower.includes(word))
  )
}

export function mockSendOrder(shopState, message, options = {}) {
  const matched = findMenuItem(shopState, message)
  const now = Date.now()
  const newState = {
    ...shopState,
    inventory: { ...(shopState.inventory ?? {}) },
    currentPrices: { ...(shopState.currentPrices ?? {}) },
    recentOrders: [...(shopState.recentOrders ?? [])],
    recentActions: [...(shopState.recentActions ?? [])],
    removedItems: [...(shopState.removedItems ?? [])],
    salesByItem: { ...(shopState.salesByItem ?? {}) },
    actionStats: { ...(shopState.actionStats ?? {}) },
  }
  const actions = []

  if (!matched) {
    return {
      shopState: newState,
      cashierReply: `Sorry, I didn't catch that. We have: ${shopState.activeMenu.join(', ')}. What can I get you?`,
      actions: [],
    }
  }

  const inv = newState.inventory
  const item = { ...inv[matched] }
  const menuMeta = newState.menuMeta?.[matched] ?? {}

  if (item.quantity <= 0 || shopState.removedItems.includes(matched)) {
    return {
      shopState: newState,
      cashierReply: `Sorry, we're out of ${matched} right now! Can I get you something else?`,
      actions: [buildMockAction({
        type: 'reject_order',
        timestamp: now,
        description: `Out of stock: ${matched}`,
        details: { item_name: matched, reason: 'Quantity is zero' },
        confidence: 0.99,
        reasoning: `${matched} is unavailable, so the AI rejected the order and redirected the customer.`,
        channel: options.channel ?? 'walk_up',
      })],
    }
  }

  const price = newState.currentPrices[matched]
  const unitCost = menuMeta.costToMake ?? Math.round(price * 0.38 * 100) / 100
  item.quantity -= 1
  item.isLow = item.quantity > 0 && item.quantity <= (item.restockThreshold ?? 2)
  item.isOut = item.quantity <= 0
  inv[matched] = item
  newState.totalRevenue = (newState.totalRevenue ?? 0) + price
  newState.totalCogs = (newState.totalCogs ?? 0) + unitCost
  newState.totalOrders = (newState.totalOrders ?? 0) + 1
  newState.cashOnHand = (newState.cashOnHand ?? 500) + price
  newState.salesByItem[matched] = (newState.salesByItem[matched] ?? 0) + 1

  const order = {
    id: nextActionId(),
    customerName: options.customerName ?? pickRandom(CUSTOMER_NAMES),
    channel: options.channel ?? 'walk_up',
    items: [{ name: matched, price }],
    total: price,
    status: 'preparing',
    timestamp: now,
  }
  newState.recentOrders = [...newState.recentOrders, order].slice(-10)

  actions.push(buildMockAction({
    type: 'take_order',
    timestamp: now,
    description: `Sold ${matched}`,
    details: {
      item_name: matched,
      order_total: Number(price.toFixed(2)),
      cogs: Number(unitCost.toFixed(2)),
      stock_after: `${item.quantity}/${item.maxCapacity}`,
    },
    confidence: 1,
    reasoning: `Processed a ${matched} order at $${price.toFixed(2)} with $${unitCost.toFixed(2)} in cost of goods.`,
    channel: options.channel ?? 'walk_up',
  }))

  // Auto-restock when hitting 0
  if (item.quantity === 0) {
    const restockQty = item.maxCapacity
    const restockCost = restockQty * unitCost
    item.quantity = restockQty
    item.isLow = false
    item.isOut = false
    inv[matched] = item
    newState.cashOnHand -= restockCost
    newState.actionStats.restocks = (newState.actionStats.restocks ?? 0) + 1
    newState.actionStats.autonomousActions = (newState.actionStats.autonomousActions ?? 0) + 1

    actions.push(buildMockAction({
      type: 'restock',
      timestamp: now + 1,
      description: `Restocked ${matched} (+${restockQty})`,
      details: {
        item_name: matched,
        applied_quantity: restockQty,
        applied_cost: Number(restockCost.toFixed(2)),
        cash_after: Number(newState.cashOnHand.toFixed(2)),
      },
      reasoning: `${matched} sold through its remaining inventory, so the AI replenished ${restockQty} units automatically.`,
      channel: 'operations',
    }))
  }

  const basePrice = menuMeta.basePrice ?? price
  const currentCount = newState.salesByItem[matched] ?? 0
  const isPeakHour = (() => {
    const hour = new Date().getHours()
    return hour >= 11 && hour <= 13
  })()

  if (
    currentCount >= 3 &&
    newState.totalOrders >= 5 &&
    price <= basePrice * 1.01
  ) {
    const surgeMultiplier = isPeakHour ? 1.15 : 1.1
    const newPrice = Number((basePrice * surgeMultiplier).toFixed(2))
    newState.currentPrices[matched] = newPrice
    newState.actionStats.pricingActions = (newState.actionStats.pricingActions ?? 0) + 1
    newState.actionStats.autonomousActions = (newState.actionStats.autonomousActions ?? 0) + 1
    actions.push(buildMockAction({
      type: 'adjust_price',
      timestamp: now + 2,
      description: `${isPeakHour ? 'Peak-hour surge' : 'Demand surge'} on ${matched}`,
      details: {
        item_name: matched,
        base_price: Number(basePrice.toFixed(2)),
        applied_price: newPrice,
        price_delta_pct: Number((((newPrice - basePrice) / basePrice) * 100).toFixed(1)),
        reason: isPeakHour ? 'Lunch rush + repeat demand' : 'Repeat demand',
      },
      confidence: 0.87,
      reasoning: `${matched} has become the hot item, so the AI raised price to protect throughput and lift margin during active demand.`,
      channel: 'operations',
    }))
  } else if (newState.totalOrders >= 8 && newState.totalOrders % 6 === 0) {
    const slowItem = Object.entries(newState.salesByItem)
      .sort((a, b) => a[1] - b[1])[0]?.[0]
    const slowMeta = newState.menuMeta?.[slowItem]
    const slowBase = slowMeta?.basePrice ?? 0
    if (slowItem && slowBase > 0 && slowItem !== matched) {
      const discounted = Number((slowBase * 0.9).toFixed(2))
      if ((newState.currentPrices[slowItem] ?? slowBase) >= slowBase) {
        newState.currentPrices[slowItem] = discounted
        newState.actionStats.pricingActions = (newState.actionStats.pricingActions ?? 0) + 1
        newState.actionStats.autonomousActions = (newState.actionStats.autonomousActions ?? 0) + 1
        actions.push(buildMockAction({
          type: 'adjust_price',
          timestamp: now + 3,
          description: `Demand discount on ${slowItem}`,
          details: {
            item_name: slowItem,
            base_price: Number(slowBase.toFixed(2)),
            applied_price: discounted,
            price_delta_pct: -10,
            reason: 'Slow mover discount',
          },
          confidence: 0.74,
          reasoning: `${slowItem} is lagging the rest of the menu, so the AI discounted it to pull demand back into the mix.`,
          channel: 'operations',
        }))
      }
    }
  }

  const replies = [
    `One ${matched}, coming right up! That'll be $${price.toFixed(2)}.`,
    `Great choice! ${matched} for $${price.toFixed(2)}. It'll be ready in a moment!`,
    `${matched} — you got it! $${price.toFixed(2)} please. Won't be long!`,
    `Excellent! One ${matched} at $${price.toFixed(2)}. Preparing it now!`,
  ]

  return {
    shopState: decorateMockState({
      ...newState,
      recentActions: [...newState.recentActions, ...actions].slice(-10),
    }),
    cashierReply: pickRandom(replies),
    actions,
  }
}

// ─────────────────── Mock rush simulation ─────────────────────────────

export function mockSimulateRush(shopState, onEvent) {
  let state = { ...shopState }
  const timeouts = []
  const rushOrders = 18

  for (let i = 0; i < rushOrders; i++) {
    const delay = i * 350 + Math.random() * 150

    timeouts.push(setTimeout(() => {
      const available = state.activeMenu.filter(
        n => !state.removedItems.includes(n) && (state.inventory[n]?.quantity ?? 0) > 0
      )
      if (available.length === 0) return

      const item = pickRandom(available)
      const customerName = pickRandom(CUSTOMER_NAMES)
      const now = Date.now()
      const price = state.currentPrices[item]
      const result = mockSendOrder(state, `Can I get a ${item}?`, {
        channel: 'walk_up',
        customerName,
      })
      state = result.shopState

      const message = {
        id: nextActionId(),
        role: 'customer',
        text: `Can I get a ${item}?`,
        channel: 'walk_up',
        customerName,
        timestamp: now,
      }
      const reply = {
        id: nextActionId(),
        role: 'cashier',
        text: `One ${item} for $${price.toFixed(2)}!`,
        channel: 'walk_up',
        timestamp: now + 50,
      }

      onEvent({ shopState: state, messages: [message, reply], actions: result.actions })
    }, delay))
  }

  // Rush complete event
  const totalDelay = rushOrders * 350 + 500
  timeouts.push(setTimeout(() => {
    onEvent({ done: true, shopState: state })
  }, totalDelay))

  return () => timeouts.forEach(clearTimeout)
}
