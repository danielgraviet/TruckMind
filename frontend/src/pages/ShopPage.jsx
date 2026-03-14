import { useEffect, useRef, useState } from 'react'
import { useShop } from '../hooks/useShop.js'
import ChatPanel from '../components/shop/ChatPanel.jsx'
import ActionFeed from '../components/shop/ActionFeed.jsx'
import InventoryBars from '../components/shop/InventoryBars.jsx'

// ─────────────────────── AnimatedNumber (inlined) ─────────────────────

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0)
  const currentRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (value == null) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = currentRef.current
    const end = value
    const duration = 800
    const startTime = performance.now()

    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = start + (end - start) * eased
      currentRef.current = current
      setDisplay(current)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString()

  return <span>{prefix}{formatted}{suffix}</span>
}

// ─────────────────────── Metric card ──────────────────────────────────

function Metric({ label, children }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2.5 min-w-0">
      <div className="text-xs text-gray-500 mb-0.5 truncate">{label}</div>
      <div className="text-lg font-bold text-white">{children}</div>
    </div>
  )
}

// ─────────────────────── Loading skeleton ──────────────────────────────

function ShopSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950 text-white animate-pulse">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800 rounded" />
          <div className="space-y-1.5">
            <div className="h-5 bg-gray-800 rounded w-40" />
            <div className="h-3 bg-gray-800 rounded w-56" />
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800 rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="h-3 bg-gray-700 rounded w-2/3" />
              <div className="h-6 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl h-96" />
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl h-56" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl h-36" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────── ShopPage ─────────────────────────────────────

export default function ShopPage({ strategy, stats, forceMock }) {
  const {
    shopState, messages, isLoading, isRushing, isSending, mockMode,
    sendMessage, simulateRush,
  } = useShop(strategy, forceMock)

  const businessName = strategy?.businessName ?? 'Your Food Truck'
  const tagline = strategy?.tagline ?? 'Live Operations'

  if (isLoading || !shopState) return <ShopSkeleton />

  const activeCount = shopState.activeMenu?.length ?? 0
  const totalItems = activeCount + (shopState.removedItems?.length ?? 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#128666;</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">{businessName}</span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-900/50 border border-green-600/40 text-green-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </span>
                {mockMode && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-600/30 text-amber-400 text-xs">
                    Demo
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{tagline}</p>
            </div>
          </div>
          <button
            onClick={simulateRush}
            disabled={isRushing}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-900/50"
          >
            {isRushing ? 'Rush in progress...' : 'Simulate Rush'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Metrics bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Revenue">
            <AnimatedNumber value={shopState.totalRevenue ?? 0} prefix="$" decimals={2} />
          </Metric>
          <Metric label="Orders">
            <AnimatedNumber value={shopState.totalOrders ?? 0} />
          </Metric>
          <Metric label="Cash on Hand">
            <AnimatedNumber value={shopState.cashOnHand ?? 0} prefix="$" decimals={0} />
          </Metric>
          <Metric label="Menu Status">
            <span>{activeCount} of {totalItems} active</span>
          </Metric>
        </div>

        {/* Main grid: Chat left, Activity + Inventory right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: '480px' }}>
          {/* Chat panel — 2/5 width on desktop */}
          <div className="lg:col-span-2 flex flex-col" style={{ minHeight: '480px' }}>
            <ChatPanel
              messages={messages}
              onSend={sendMessage}
              isSending={isSending}
            />
          </div>

          {/* Right column — 3/5 width on desktop */}
          <div className="lg:col-span-3 flex flex-col gap-4" style={{ minHeight: '480px' }}>
            {/* Action feed — takes remaining space */}
            <div className="flex-1 min-h-0" style={{ minHeight: '260px' }}>
              <ActionFeed actions={shopState.recentActions ?? []} />
            </div>

            {/* Inventory bars */}
            <InventoryBars
              inventory={shopState.inventory}
              currentPrices={shopState.currentPrices}
              removedItems={shopState.removedItems ?? []}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
