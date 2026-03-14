import { useState } from 'react'
import { useShop } from '../hooks/useShop.js'

// ─────────────────────── Parallel component imports ─────────────────────
// These are being built by other agents and will exist at integration time.
import OpsSidebar from '../components/shop/OpsSidebar.jsx'
import OpsHeader from '../components/shop/OpsHeader.jsx'
import LiveFeed from '../components/shop/LiveFeed.jsx'
import OrderQueue from '../components/shop/OrderQueue.jsx'
import AIDecisionCard from '../components/shop/AIDecisionCard.jsx'
import MonitoringPanel from '../components/shop/MonitoringPanel.jsx'
import CustomerChannel from '../components/shop/CustomerChannel.jsx'
import EscalationCard from '../components/shop/EscalationCard.jsx'
import RulesForm from '../components/shop/RulesForm.jsx'
import PricingTimeline from '../components/shop/PricingTimeline.jsx'
import InventoryTimeline from '../components/shop/InventoryTimeline.jsx'

// ─────────────────────── Existing component imports ─────────────────────
import InventoryBars from '../components/shop/InventoryBars.jsx'
import PriceTable from '../components/shop/PriceTable.jsx'

// ─────────────────────── Section: Operations ────────────────────────────

function OpsSection({ shopState, strategy }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <OrderQueue orders={shopState?.recentOrders ?? []} />
      <AIDecisionCard decisions={shopState?.recentActions ?? []} />
      <div className="col-span-2 grid grid-cols-3 gap-4">
        <MonitoringPanel title="Scheduling" type="scheduling" strategy={strategy} />
        <MonitoringPanel title="Staffing" type="staffing" shopState={shopState} />
        <MonitoringPanel title="Routing" type="routing" orders={shopState?.recentOrders ?? []} />
      </div>
    </div>
  )
}

// ─────────────────────── Section: Customer Service ──────────────────────

function CustomerServiceSection({ walkUpMessages, textMessages, escalationMessages, onChannelMessage }) {
  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      <CustomerChannel
        channel="walk_up"
        title="Walk-up Orders"
        messages={walkUpMessages}
        onSend={(msg) => onChannelMessage('walk_up', msg)}
      />
      <CustomerChannel
        channel="text_order"
        title="Text Orders"
        messages={textMessages}
        onSend={(msg) => onChannelMessage('text_order', msg)}
      />
      <CustomerChannel
        channel="escalation"
        title="Escalations"
        messages={escalationMessages}
        onSend={(msg) => onChannelMessage('escalation', msg)}
        isEscalation={true}
      />
    </div>
  )
}

// ─────────────────────── Section: Inventory ─────────────────────────────

function InventorySection({ shopState }) {
  return (
    <div className="space-y-4">
      <InventoryBars
        inventory={shopState?.inventory ?? {}}
        currentPrices={shopState?.currentPrices ?? {}}
      />
      <InventoryTimeline actions={shopState?.recentActions ?? []} />
    </div>
  )
}

// ─────────────────────── Section: Pricing ───────────────────────────────

function PricingSection({ shopState, strategy }) {
  return (
    <div className="space-y-4">
      <PriceTable
        currentPrices={shopState?.currentPrices ?? {}}
        inventory={shopState?.inventory ?? {}}
      />
      <PricingTimeline actions={shopState?.recentActions ?? []} menu={strategy?.menu ?? []} />
    </div>
  )
}

// ─────────────────────── Section: Rules ─────────────────────────────────

function RulesSection({ rules, onSave }) {
  return (
    <RulesForm rules={rules} onSave={onSave} />
  )
}

// ─────────────────────── Loading skeleton ────────────────────────────────

function ShopSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden animate-pulse">
      <header className="border-b border-gray-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800 rounded" />
          <div className="space-y-1.5">
            <div className="h-5 bg-gray-800 rounded w-40" />
            <div className="h-3 bg-gray-800 rounded w-56" />
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 bg-gray-900 border-r border-gray-800" />
        <div className="flex-1 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-48" />
            ))}
          </div>
        </div>
        <div className="w-72 bg-gray-900 border-l border-gray-800" />
      </div>
    </div>
  )
}

// ─────────────────────── ShopPage ───────────────────────────────────────

export default function ShopPage({ strategy, stats, forceMock }) {
  const [activeSection, setActiveSection] = useState('ops')

  const {
    shopState, messages, isLoading, isRushing, isSending, mockMode,
    sendMessage, simulateRush,
    rules, liveEvents, walkUpMessages, textMessages, escalationMessages,
    rushMode, rushCountdown, customerTrickle,
    loadRules, saveRules, handleChannelMessage, startTrickle, startRush,
  } = useShop(strategy, forceMock)

  const businessName = strategy?.businessName ?? 'Your Food Truck'

  if (isLoading || !shopState) return <ShopSkeleton />

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* HEADER - fixed at top */}
      <OpsHeader
        businessName={businessName}
        mockMode={mockMode}
        shopState={shopState}
        rushMode={rushMode}
        rushCountdown={rushCountdown}
        customerTrickle={customerTrickle}
        onStartRush={startRush}
        onToggleTrickle={() => startTrickle()}
        isRushing={isRushing}
      />

      {/* THREE ZONES - fill remaining height */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR - ~64px wide, icon nav */}
        <OpsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        {/* MAIN CONTENT - scrollable */}
        <main className="flex-1 overflow-y-auto p-4">
          {activeSection === 'ops' && (
            <OpsSection shopState={shopState} strategy={strategy} />
          )}
          {activeSection === 'cs' && (
            <CustomerServiceSection
              walkUpMessages={walkUpMessages}
              textMessages={textMessages}
              escalationMessages={escalationMessages}
              onChannelMessage={handleChannelMessage}
            />
          )}
          {activeSection === 'inventory' && (
            <InventorySection shopState={shopState} />
          )}
          {activeSection === 'pricing' && (
            <PricingSection shopState={shopState} strategy={strategy} />
          )}
          {activeSection === 'rules' && (
            <RulesSection rules={rules} onSave={saveRules} />
          )}
        </main>

        {/* RIGHT SIDEBAR - ~280px wide, always visible */}
        <LiveFeed events={liveEvents} />
      </div>
    </div>
  )
}
