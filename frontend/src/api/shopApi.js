// ─────────────────────────── Normalize backend → frontend ─────────────

let _normActionId = 1000
let _normOrderId = 1000

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

function normalizeAction(raw) {
  return {
    id: raw.id ?? `action-${_normActionId++}`,
    type: raw.action_type ?? raw.type,
    description: raw.description,
    details: typeof raw.details === 'string' ? raw.details : JSON.stringify(raw.details ?? ''),
    timestamp: raw.timestamp ?? Date.now(),
  }
}

function normalizeShopState(raw) {
  if (!raw) return null

  // Convert inventory array → { [name]: { quantity, maxCapacity } }
  const inventory = {}
  if (Array.isArray(raw.inventory)) {
    for (const item of raw.inventory) {
      inventory[item.menu_item_name] = {
        quantity: item.quantity_remaining,
        maxCapacity: item.max_capacity,
      }
    }
  } else if (raw.inventory && typeof raw.inventory === 'object') {
    // Already in frontend shape (mock mode)
    Object.assign(inventory, raw.inventory)
  }

  // Convert active_menu from array of dicts → array of name strings
  let activeMenu = []
  if (Array.isArray(raw.active_menu)) {
    activeMenu = raw.active_menu.map(item =>
      typeof item === 'string' ? item : item.name
    )
  } else if (Array.isArray(raw.activeMenu)) {
    activeMenu = raw.activeMenu
  }

  // Build currentPrices: backend current_prices only has overrides, so fill in
  // base_price from active_menu items for any items without an override
  const overrides = raw.current_prices ?? raw.currentPrices ?? {}
  const currentPrices = { ...overrides }
  if (Array.isArray(raw.active_menu)) {
    for (const item of raw.active_menu) {
      if (typeof item === 'object' && item.name && !(item.name in currentPrices)) {
        currentPrices[item.name] = item.base_price
      }
    }
  }

  // Normalize actions: backend uses action_type (no id/timestamp)
  const recentActions = (raw.recent_actions ?? raw.recentActions ?? []).map(normalizeAction)

  return {
    activeMenu,
    inventory,
    currentPrices,
    recentOrders: (raw.recent_orders ?? raw.recentOrders ?? [])
      .map(order => normalizeOrder(order))
      .filter(Boolean),
    recentActions,
    removedItems: raw.removed_items ?? raw.removedItems ?? [],
    totalRevenue: raw.total_revenue ?? raw.totalRevenue ?? 0,
    totalOrders: raw.total_orders ?? raw.totalOrders ?? 0,
    cashOnHand: raw.cash_on_hand ?? raw.cashOnHand ?? 500,
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
  return res.json()
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
  return res.json()
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
  return {
    max_markup_pct: 0.25,
    min_margin_multiplier: 1.10,
    max_restock_spend_pct: 0.50,
    min_cash_reserve: 50.0,
    max_actions_per_cycle: 2,
    cooldown_orders: 8,
    periodic_review_interval: 5,
    min_orders_for_trends: 8,
    category_inventory: {
      entree: { qty: 10, threshold: 4, max: 50 },
      side: { qty: 8, threshold: 3, max: 30 },
      drink: { qty: 15, threshold: 4, max: 50 },
      dessert: { qty: 6, threshold: 3, max: 25 },
    }
  }
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

export function buildMockShopState(strategy) {
  if (!strategy?.menu?.length) return null

  const inventory = {}
  const currentPrices = {}

  for (const item of strategy.menu) {
    const cap = CATEGORY_CAPACITY[item.category] ?? 10
    inventory[item.name] = { quantity: cap, maxCapacity: cap }
    currentPrices[item.name] = item.base_price
  }

  return {
    activeMenu: strategy.menu.map(i => i.name),
    inventory,
    currentPrices,
    recentOrders: [],
    recentActions: [],
    removedItems: [],
    totalRevenue: 0,
    totalOrders: 0,
    cashOnHand: 500,
  }
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
  const newState = { ...shopState }
  const actions = []

  if (!matched) {
    return {
      shopState: newState,
      cashierReply: `Sorry, I didn't catch that. We have: ${shopState.activeMenu.join(', ')}. What can I get you?`,
      actions: [],
    }
  }

  const inv = { ...newState.inventory }
  const item = { ...inv[matched] }

  if (item.quantity <= 0 || shopState.removedItems.includes(matched)) {
    return {
      shopState: newState,
      cashierReply: `Sorry, we're out of ${matched} right now! Can I get you something else?`,
      actions: [{
        id: nextActionId(), type: 'reject_order', timestamp: now,
        description: `Out of stock: ${matched}`,
        details: `Customer requested ${matched} but quantity is 0`,
      }],
    }
  }

  const price = newState.currentPrices[matched]
  item.quantity -= 1
  inv[matched] = item
  newState.inventory = inv
  newState.totalRevenue = (newState.totalRevenue ?? 0) + price
  newState.totalOrders = (newState.totalOrders ?? 0) + 1
  newState.cashOnHand = (newState.cashOnHand ?? 500) + price

  const order = {
    id: nextActionId(),
    customerName: options.customerName ?? pickRandom(CUSTOMER_NAMES),
    channel: options.channel ?? 'walk_up',
    items: [{ name: matched, price }],
    total: price,
    status: 'preparing',
    timestamp: now,
  }
  newState.recentOrders = [...(newState.recentOrders ?? []), order]

  actions.push({
    id: nextActionId(), type: 'take_order', timestamp: now,
    description: `Sold ${matched}`,
    details: `+$${price.toFixed(2)} | Stock: ${item.quantity}/${item.maxCapacity}`,
  })

  // Auto-restock when hitting 0
  if (item.quantity === 0) {
    const restockQty = item.maxCapacity
    const restockCost = restockQty * (price * 0.4)
    item.quantity = restockQty
    inv[matched] = item
    newState.inventory = inv
    newState.cashOnHand -= restockCost

    actions.push({
      id: nextActionId(), type: 'restock', timestamp: now + 1,
      description: `Restocked ${matched} (+${restockQty})`,
      details: `Cash: $${(newState.cashOnHand + restockCost).toFixed(0)} → $${newState.cashOnHand.toFixed(0)}`,
    })
  }

  const replies = [
    `One ${matched}, coming right up! That'll be $${price.toFixed(2)}.`,
    `Great choice! ${matched} for $${price.toFixed(2)}. It'll be ready in a moment!`,
    `${matched} — you got it! $${price.toFixed(2)} please. Won't be long!`,
    `Excellent! One ${matched} at $${price.toFixed(2)}. Preparing it now!`,
  ]

  return {
    shopState: newState,
    cashierReply: pickRandom(replies),
    actions,
  }
}

// ─────────────────── Mock rush simulation ─────────────────────────────

export function mockSimulateRush(shopState, onEvent) {
  let state = { ...shopState }
  const timeouts = []
  const orderCounts = {} // track per-item order counts for surge pricing

  const rushOrders = 18
  const items = state.activeMenu.filter(n => !state.removedItems.includes(n))

  for (let i = 0; i < rushOrders; i++) {
    const delay = i * 350 + Math.random() * 150

    timeouts.push(setTimeout(() => {
      const available = state.activeMenu.filter(
        n => !state.removedItems.includes(n) && (state.inventory[n]?.quantity ?? 0) > 0
      )
      if (available.length === 0) return

      const item = pickRandom(available)
      const customerName = pickRandom(CUSTOMER_NAMES)
      const price = state.currentPrices[item]
      const now = Date.now()

      // Process order
      const inv = { ...state.inventory }
      const stock = { ...inv[item] }
      stock.quantity -= 1
      inv[item] = stock

      const order = {
        id: nextActionId(),
        customerName,
        channel: 'walk_up',
        items: [{ name: item, price }],
        total: price,
        status: 'preparing',
        timestamp: now,
      }

      state = {
        ...state,
        inventory: inv,
        totalRevenue: state.totalRevenue + price,
        totalOrders: state.totalOrders + 1,
        cashOnHand: state.cashOnHand + price,
        recentOrders: [...(state.recentOrders ?? []), order],
      }

      orderCounts[item] = (orderCounts[item] ?? 0) + 1

      const actions = [{
        id: nextActionId(), type: 'take_order', timestamp: now,
        description: `${customerName} ordered ${item}`,
        details: `+$${price.toFixed(2)} | Stock: ${stock.quantity}/${stock.maxCapacity}`,
      }]

      const message = {
        id: nextActionId(),
        role: 'customer',
        text: `Can I get a ${item}?`,
        customerName,
        timestamp: now,
      }
      const reply = {
        id: nextActionId(),
        role: 'cashier',
        text: `One ${item} for $${price.toFixed(2)}!`,
        timestamp: now + 50,
      }

      // Auto-remove + restock when hitting 0
      if (stock.quantity === 0) {
        const restockQty = stock.maxCapacity
        const restockCost = restockQty * (price * 0.4)
        stock.quantity = restockQty
        inv[item] = stock
        state = { ...state, inventory: inv, cashOnHand: state.cashOnHand - restockCost }

        actions.push({
          id: nextActionId(), type: 'restock', timestamp: now + 100,
          description: `Restocked ${item} (+${restockQty})`,
          details: `Cash: $${(state.cashOnHand + restockCost).toFixed(0)} → $${state.cashOnHand.toFixed(0)}`,
        })
      }

      // Surge pricing every 5th order on popular items
      if (i > 0 && i % 5 === 0) {
        const popular = Object.entries(orderCounts)
          .sort((a, b) => b[1] - a[1])[0]
        if (popular && popular[1] >= 3) {
          const surgeItem = popular[0]
          const oldPrice = state.currentPrices[surgeItem]
          const newPrice = Math.round(oldPrice * 1.15 * 100) / 100
          state = {
            ...state,
            currentPrices: { ...state.currentPrices, [surgeItem]: newPrice },
          }
          actions.push({
            id: nextActionId(), type: 'adjust_price', timestamp: now + 200,
            description: `Surge: ${surgeItem}`,
            details: `$${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (+15%)`,
          })
        }
      }

      // Slow mover discount at order 10
      if (i === 10) {
        const slowest = Object.entries(orderCounts)
          .filter(([name]) => state.activeMenu.includes(name))
          .sort((a, b) => a[1] - b[1])[0]
        if (slowest) {
          const slowItem = slowest[0]
          const oldPrice = state.currentPrices[slowItem]
          const newPrice = Math.round(oldPrice * 0.85 * 100) / 100
          state = {
            ...state,
            currentPrices: { ...state.currentPrices, [slowItem]: newPrice },
          }
          actions.push({
            id: nextActionId(), type: 'adjust_price', timestamp: now + 200,
            description: `Discount: ${slowItem}`,
            details: `$${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (-15%)`,
          })
        }
      }

      onEvent({ shopState: state, messages: [message, reply], actions })
    }, delay))
  }

  // Rush complete event
  const totalDelay = rushOrders * 350 + 500
  timeouts.push(setTimeout(() => {
    onEvent({ done: true, shopState: state })
  }, totalDelay))

  return () => timeouts.forEach(clearTimeout)
}
