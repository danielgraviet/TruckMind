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
import OwnerKpiStrip from '../components/shop/OwnerKpiStrip.jsx'

// ─────────────────────── Existing component imports ─────────────────────
import InventoryBars from '../components/shop/InventoryBars.jsx'
import PriceTable from '../components/shop/PriceTable.jsx'

// ─────────────────────── Section: Operations ────────────────────────────

function OpsSection({ shopState, strategy }) {
  const latestEscalation = [...(shopState?.recentActions ?? [])].reverse().find((action) => action.escalated)

  return (
    <div className="space-y-4">
      <OwnerKpiStrip shopState={shopState} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <OrderQueue orders={shopState?.recentOrders ?? []} />
        <AIDecisionCard decisions={shopState?.recentActions ?? []} />
      </div>
      {latestEscalation && <EscalationCard action={latestEscalation} />}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MonitoringPanel title="Scheduling" type="scheduling" strategy={strategy} />
        <MonitoringPanel title="Staffing" type="staffing" shopState={shopState} />
        <MonitoringPanel title="Routing" type="routing" orders={shopState?.recentOrders ?? []} />
      </div>
    </div>
  )
}

// ─────────────────────── Section: Customer Service ──────────────────────

function CustomerServiceSection({
  walkUpMessages,
  textMessages,
  escalationMessages,
  onChannelMessage,
  automationActive,
  channelSending,
}) {
  return (
    <div className="space-y-4 h-full">
      <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2
              className="text-[10px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
            >
              Customer Message Lanes
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
              Customers flow in automatically — the AI cashier replies in-channel.
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={automationActive
              ? { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(201,241,53,0.2)' }
              : { background: 'var(--bg-card)', color: 'var(--text-3)', border: '1px solid var(--border)' }
            }
          >
            {automationActive ? 'Autopilot Live' : 'Standby'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 h-full">
        <CustomerChannel
          channel="walk_up"
          title="Walk-up Orders"
          messages={walkUpMessages}
          onSend={(msg) => onChannelMessage('walk_up', msg)}
          automationActive={automationActive}
          isSending={channelSending?.walk_up}
        />
        <CustomerChannel
          channel="text_order"
          title="Text Orders"
          messages={textMessages}
          onSend={(msg) => onChannelMessage('text_order', msg)}
          automationActive={automationActive}
          isSending={channelSending?.text_order}
        />
        <CustomerChannel
          channel="escalation"
          title="Escalations"
          messages={escalationMessages}
          onSend={(msg) => onChannelMessage('escalation', msg)}
          isEscalation={true}
          automationActive={automationActive}
          isSending={channelSending?.escalation}
        />
      </div>
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
        removedItems={shopState?.removedItems ?? []}
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
        menu={strategy?.menu ?? []}
        currentPrices={shopState?.currentPrices ?? {}}
        inventory={shopState?.inventory ?? {}}
        actions={shopState?.recentActions ?? []}
      />
      <PricingTimeline
        actions={shopState?.recentActions ?? []}
        menu={strategy?.menu ?? []}
        currentPrices={shopState?.currentPrices ?? {}}
      />
    </div>
  )
}

// ─────────────────────── Loading skeleton ────────────────────────────────

function ShopSkeleton() {
  return (
    <div className="h-screen flex flex-col overflow-hidden animate-pulse" style={{ background: 'var(--bg-base)' }}>
      <header className="px-5 py-3 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', minHeight: '52px' }}>
        <div className="space-y-1.5">
          <div className="h-4 rounded-lg w-36" style={{ background: 'var(--bg-card)' }} />
          <div className="h-2.5 rounded w-24" style={{ background: 'var(--bg-card)' }} />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 flex-shrink-0" style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }} />
        <div className="flex-1 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="rounded-2xl h-32" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
            ))}
          </div>
        </div>
        <div className="w-72 flex-shrink-0" style={{ background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)' }} />
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
    loadRules, saveRules, handleChannelMessage, startTrickle, startRush, streamConnected, channelSending,
  } = useShop(strategy, forceMock)

  const businessName = strategy?.businessName ?? 'Your Food Truck'

  if (isLoading || !shopState) return <ShopSkeleton />

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-1)' }}>
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
        <main className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--bg-base)' }}>
          {activeSection === 'ops' && (
            <OpsSection shopState={shopState} strategy={strategy} />
          )}
          {activeSection === 'cs' && (
            <CustomerServiceSection
              walkUpMessages={walkUpMessages}
              textMessages={textMessages}
              escalationMessages={escalationMessages}
              onChannelMessage={handleChannelMessage}
              automationActive={customerTrickle && (mockMode || streamConnected)}
              channelSending={channelSending}
            />
          )}
          {activeSection === 'inventory' && (
            <InventorySection shopState={shopState} />
          )}
          {activeSection === 'pricing' && (
            <PricingSection shopState={shopState} strategy={strategy} />
          )}
          {activeSection === 'rules' && (
            <RulesForm rules={rules} onSave={saveRules} />
          )}
        </main>

        {/* RIGHT SIDEBAR - ~280px wide, always visible */}
        <LiveFeed events={liveEvents} />
      </div>
    </div>
  )
}
