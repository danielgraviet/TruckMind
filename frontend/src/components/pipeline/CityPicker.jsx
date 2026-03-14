import { useState } from 'react'

// ─── Cached cities (backend has census data for these) ─────────────────────
const CITIES = [
  { name: 'Salt Lake City, UT',  label: 'Salt Lake City',  lat: 40.76, lon: -111.89 },
  { name: 'West Valley City, UT',label: 'West Valley City',lat: 40.69, lon: -111.98 },
  { name: 'Park City, UT',       label: 'Park City',       lat: 40.65, lon: -111.50 },
  { name: 'Lehi, UT',            label: 'Lehi',            lat: 40.39, lon: -111.85 },
  { name: 'Orem, UT',            label: 'Orem',            lat: 40.30, lon: -111.69 },
  { name: 'Provo, UT',           label: 'Provo',           lat: 40.23, lon: -111.66 },
  { name: 'Logan, UT',           label: 'Logan',           lat: 41.73, lon: -111.83 },
  { name: 'St. George, UT',      label: 'St. George',      lat: 37.10, lon: -113.58 },
]

// ─── SVG map constants ────────────────────────────────────────────────────
const SVG_W = 200
const SVG_H = 250
const LAT_MAX = 42.0
const LAT_MIN = 37.0
const LON_MIN = -114.0
const LON_MAX = -109.0

// Utah simplified polygon — NE notch where Wyoming/Colorado meet
// (42,-114)→(42,-111)→(41,-111)→(41,-109)→(37,-109)→(37,-114)
const UTAH_PATH = 'M 0,0 L 120,0 L 120,50 L 200,50 L 200,250 L 0,250 Z'

function latLonToXY(lat, lon) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_W
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * SVG_H
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

// ─── CityPicker ────────────────────────────────────────────────────────────

export default function CityPicker({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(null)

  const active = hovered ?? value

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">Location</label>

      <div className={`bg-gray-800/60 border rounded-lg p-3 flex gap-4 transition-colors ${disabled ? 'opacity-50 pointer-events-none border-gray-700' : 'border-gray-700 hover:border-gray-600'}`}>

        {/* ── SVG Map ─────────────────────────────── */}
        <div className="shrink-0 flex flex-col items-center">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-28 h-36"
            style={{ overflow: 'visible' }}
          >
            {/* State fill with subtle gradient feel */}
            <path d={UTAH_PATH} fill="#1a2236" stroke="#2d3f5e" strokeWidth="1.5" />

            {/* City dots */}
            {CITIES.map(city => {
              const [x, y] = latLonToXY(city.lat, city.lon)
              const isSelected = value === city.name
              const isActive   = active === city.name

              return (
                <g
                  key={city.name}
                  onClick={() => !disabled && onChange(city.name)}
                  onMouseEnter={() => setHovered(city.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: disabled ? 'default' : 'pointer' }}
                >
                  {/* Outer pulse ring for selected */}
                  {isSelected && (
                    <circle cx={x} cy={y} r={9} fill="rgb(99 102 241 / 0.15)" stroke="rgb(99 102 241 / 0.3)" strokeWidth="1" />
                  )}
                  {/* Hover glow */}
                  {isActive && !isSelected && (
                    <circle cx={x} cy={y} r={7} fill="rgb(107 114 128 / 0.2)" />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 5 : isActive ? 4.5 : 3.5}
                    fill={isSelected ? '#818cf8' : isActive ? '#9ca3af' : '#374151'}
                    stroke={isSelected ? '#c7d2fe' : isActive ? '#6b7280' : '#4b5563'}
                    strokeWidth="1"
                  />
                </g>
              )
            })}
          </svg>
          <p className="text-gray-600 text-[10px] mt-0.5">Utah</p>
        </div>

        {/* ── City list ───────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center gap-0.5">
          {CITIES.map(city => {
            const isSelected = value === city.name
            const isHovered  = hovered === city.name
            return (
              <button
                key={city.name}
                type="button"
                disabled={disabled}
                onClick={() => onChange(city.name)}
                onMouseEnter={() => setHovered(city.name)}
                onMouseLeave={() => setHovered(null)}
                className={`
                  text-left px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2
                  ${isSelected
                    ? 'text-indigo-300 bg-indigo-950/70 border border-indigo-800/50'
                    : isHovered
                    ? 'text-gray-200 bg-gray-700/60 border border-transparent'
                    : 'text-gray-400 border border-transparent hover:text-gray-300'}
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isSelected ? 'bg-indigo-400' : 'bg-gray-700'}`} />
                {city.label}
              </button>
            )
          })}
          <p className="text-gray-600 text-[10px] px-2.5 pt-1.5">More cities coming soon</p>
        </div>
      </div>
    </div>
  )
}
