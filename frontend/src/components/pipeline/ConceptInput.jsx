import { useState } from 'react'

export default function ConceptInput({ onRun, isRunning, mockMode, onToggleMock, buttonLabel = 'Run Analysis' }) {
  const [concept, setConcept]   = useState('')
  const [location, setLocation] = useState('Provo, UT')

  const handleSubmit = e => {
    e.preventDefault()
    if (!concept.trim() || isRunning) return
    onRun(concept.trim(), location.trim())
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-white mb-4">Describe Your Food Truck</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5" htmlFor="concept">
            Concept
          </label>
          <textarea
            id="concept"
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="e.g. Authentic Korean BBQ truck serving office workers downtown"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
            rows={3}
            disabled={isRunning}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="City, State"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
            disabled={isRunning}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          {/* Demo mode toggle */}
          <button
            type="button"
            onClick={onToggleMock}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className={`w-9 h-5 rounded-full relative transition-colors ${mockMode ? 'bg-indigo-600' : 'bg-gray-700'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mockMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-400">Demo Mode</span>
          </button>

          <button
            type="submit"
            disabled={!concept.trim() || isRunning}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isRunning ? 'Running…' : buttonLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
