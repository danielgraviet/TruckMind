import { useState } from 'react'

const sections = [
  { id: 'ops', icon: '\u26A1', label: 'Operations' },
  { id: 'cs', icon: '\uD83D\uDCAC', label: 'Customer Service' },
  { id: 'inventory', icon: '\uD83D\uDCE6', label: 'Inventory' },
  { id: 'pricing', icon: '\uD83D\uDCB0', label: 'Pricing' },
  { id: 'rules', icon: '\u2699\uFE0F', label: 'Rules' },
]

function SidebarItem({ section, isActive, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => onClick(section.id)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-all duration-150 ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
        }`}
      >
        {section.icon}
      </button>
      {showTooltip && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-white whitespace-nowrap z-50 pointer-events-none">
          {section.label}
        </div>
      )}
    </div>
  )
}

export default function OpsSidebar({ activeSection = 'ops', onSectionChange }) {
  return (
    <nav className="bg-gray-900 border-r border-gray-800 w-16 flex flex-col items-center py-4 gap-2">
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
