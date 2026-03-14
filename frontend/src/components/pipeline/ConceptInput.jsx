import { useState } from 'react'
import CityPicker from './CityPicker.jsx'

export default function ConceptInput({ onRun, isRunning, mockMode, onToggleMock, buttonLabel = 'Run Analysis' }) {
  const [concept, setConcept]   = useState('')
  const [location, setLocation] = useState('Provo, UT')

  const handleSubmit = e => {
    e.preventDefault()
    if (!concept.trim() || isRunning) return
    onRun(concept.trim(), location.trim())
  }

  const canSubmit = !isRunning && !!concept.trim() && !!location

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Heading */}
      <div>
        <h2
          className="text-xl font-bold text-white tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Describe Your Food Truck
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
        >
          The AI will generate and battle-test 3 strategies, then pick the winner.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Concept textarea */}
        <div>
          <label
            htmlFor="concept"
            className="block text-[10px] uppercase tracking-[0.18em] mb-2"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
          >
            Concept
          </label>
          <textarea
            id="concept"
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="e.g. Authentic Korean BBQ truck serving office workers downtown"
            rows={3}
            disabled={isRunning}
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-opacity-30 resize-none focus:outline-none transition-colors"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              fontFamily: 'var(--font-body)',
              caretColor: 'var(--accent)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border-strong)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* City picker */}
        <CityPicker
          value={location}
          onChange={setLocation}
          disabled={isRunning}
        />

        {/* Footer row */}
        <div className="flex items-center justify-between pt-1">
          {/* Demo toggle */}
          <button
            type="button"
            onClick={onToggleMock}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div
              className="w-9 h-5 rounded-full relative transition-all duration-200"
              style={{ background: mockMode ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border-strong)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                style={{
                  background: mockMode ? '#0f0f0f' : 'var(--text-3)',
                  transform: mockMode ? 'translateX(17px)' : 'translateX(1px)',
                }}
              />
            </div>
            <span
              className="text-[11px] transition-colors"
              style={{ color: mockMode ? 'var(--text-2)' : 'var(--text-3)', fontFamily: 'var(--font-body)' }}
            >
              Demo Mode
            </span>
          </button>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-30"
            style={{
              background: canSubmit ? 'var(--accent)' : 'var(--bg-card)',
              color: canSubmit ? '#0f0f0f' : 'var(--text-3)',
              fontFamily: 'var(--font-body)',
              boxShadow: canSubmit ? '0 0 20px var(--accent-glow)' : 'none',
            }}
            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.boxShadow = '0 0 28px var(--accent-glow)' }}
            onMouseLeave={e => { if (canSubmit) e.currentTarget.style.boxShadow = '0 0 20px var(--accent-glow)' }}
          >
            {isRunning ? 'Running…' : buttonLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
