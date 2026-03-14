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

  return (
    <div className="relative rounded-xl p-px bg-gradient-to-b from-gray-700 to-gray-800">
      <div className="bg-gray-900 rounded-xl p-5">

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="concept">
              Describe your concept
            </label>
            <textarea
              id="concept"
              value={concept}
              onChange={e => setConcept(e.target.value)}
              placeholder="e.g. Authentic Korean BBQ truck serving office workers downtown"
              className="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 resize-none transition-colors"
              rows={3}
              disabled={isRunning}
            />
          </div>

          <CityPicker
            value={location}
            onChange={setLocation}
            disabled={isRunning}
          />

          <div className="flex items-center justify-between pt-1">
            {/* Demo mode toggle */}
            <button
              type="button"
              onClick={onToggleMock}
              className="flex items-center gap-2 cursor-pointer select-none group"
            >
              <div className={`w-9 h-5 rounded-full relative transition-colors ${mockMode ? 'bg-indigo-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mockMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Demo Mode</span>
            </button>

            <button
              type="submit"
              disabled={!concept.trim() || !location || isRunning}
              className="relative bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  {buttonLabel}
                  <span className="text-indigo-300">→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
