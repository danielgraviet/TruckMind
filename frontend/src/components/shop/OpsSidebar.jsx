import { useState } from 'react'

function ZapIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const sections = [
  { id: 'ops',       label: 'Operations',       Icon: ZapIcon },
  { id: 'cs',        label: 'Customer Service',  Icon: ChatIcon },
  { id: 'inventory', label: 'Inventory',         Icon: BoxIcon },
  { id: 'pricing',   label: 'Pricing',           Icon: DollarIcon },
  { id: 'rules',     label: 'Rules',             Icon: SettingsIcon },
]

function SidebarItem({ section, isActive, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => onClick(section.id)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={isActive
          ? { background: 'var(--accent)', color: '#0a0a0a' }
          : { color: 'var(--text-3)' }
        }
        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 hover:text-white"
        onMouseOver={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-1)' }}
        onMouseOut={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-3)' }}
      >
        <section.Icon />
      </button>
      {showTooltip && (
        <div
          className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 pointer-events-none"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-1)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {section.label}
        </div>
      )}
    </div>
  )
}

export default function OpsSidebar({ activeSection = 'ops', onSectionChange }) {
  return (
    <nav
      className="w-16 flex flex-col items-center py-5 gap-1.5 flex-shrink-0"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* Brand dots */}
      <div className="flex items-center gap-1 mb-5">
        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-3)' }} />
      </div>

      {sections.map((section) => (
        <SidebarItem
          key={section.id}
          section={section}
          isActive={activeSection === section.id}
          onClick={onSectionChange}
        />
      ))}
    </nav>
  )
}
