import { useState } from 'react'

const CITIES = [
  { name: 'Salt Lake City, UT',   label: 'Salt Lake City',   lat: 40.76, lon: -111.89 },
  { name: 'West Valley City, UT', label: 'West Valley City', lat: 40.69, lon: -111.98 },
  { name: 'Park City, UT',        label: 'Park City',        lat: 40.65, lon: -111.50 },
  { name: 'Lehi, UT',             label: 'Lehi',             lat: 40.39, lon: -111.85 },
  { name: 'Orem, UT',             label: 'Orem',             lat: 40.30, lon: -111.69 },
  { name: 'Provo, UT',            label: 'Provo',            lat: 40.23, lon: -111.66 },
  { name: 'Logan, UT',            label: 'Logan',            lat: 41.73, lon: -111.83 },
  { name: 'St. George, UT',       label: 'St. George',       lat: 37.10, lon: -113.58 },
]

const SVG_W = 200
const SVG_H = 250
const LAT_MAX = 42.0, LAT_MIN = 37.0
const LON_MIN = -114.0, LON_MAX = -109.0
const UTAH_PATH = 'M 0,0 L 120,0 L 120,50 L 200,50 L 200,250 L 0,250 Z'

function latLonToXY(lat, lon) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_W
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * SVG_H
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

export default function CityPicker({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(null)
  const active = hovered ?? value

  return (
    <div>
      <label
        className="block text-[10px] uppercase tracking-[0.18em] mb-2"
        style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
      >
        Location
      </label>

      <div
        className="flex gap-4 rounded-xl p-3 transition-colors"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          opacity: disabled ? 0.4 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      >
        {/* ── SVG Map ── */}
        <div className="shrink-0 flex flex-col items-center">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-28 h-36"
            style={{ overflow: 'visible' }}
          >
            {/* State fill */}
            <path d={UTAH_PATH} fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="1.5" />

            {CITIES.map(city => {
              const [x, y] = latLonToXY(city.lat, city.lon)
              const isSelected = value === city.name
              const isActive   = active === city.name

              return (
                <g
                  key={city.name}
                  onClick={() => onChange(city.name)}
                  onMouseEnter={() => setHovered(city.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glow ring — selected */}
                  {isSelected && (
                    <circle
                      cx={x} cy={y} r={10}
                      fill="var(--accent-dim)"
                      stroke="var(--accent)"
                      strokeWidth="0.75"
                      opacity="0.5"
                    />
                  )}
                  {/* Hover ring */}
                  {isActive && !isSelected && (
                    <circle cx={x} cy={y} r={7} fill="var(--border-strong)" opacity="0.6" />
                  )}
                  <circle
                    cx={x} cy={y}
                    r={isSelected ? 5 : isActive ? 4.5 : 3.5}
                    fill={isSelected ? 'var(--accent)' : isActive ? 'var(--text-3)' : 'var(--border-strong)'}
                    stroke={isSelected ? 'var(--accent)' : 'none'}
                    strokeWidth="1"
                  />
                </g>
              )
            })}
          </svg>
          <p
            className="text-[10px] mt-0.5"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
          >
            Utah
          </p>
        </div>

        {/* ── City list ── */}
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
                className="text-left px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
                style={{
                  background: isSelected ? 'var(--accent-dim)' : isHovered ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                  color: isSelected ? 'var(--accent)' : isHovered ? 'var(--text-1)' : 'var(--text-3)',
                  fontFamily: 'var(--font-body)',
                  opacity: isSelected ? 1 : 0.85,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                  style={{ background: isSelected ? 'var(--accent)' : 'var(--border-strong)' }}
                />
                {city.label}
              </button>
            )
          })}
          <p
            className="text-[10px] px-2.5 pt-1.5"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)', opacity: 0.5 }}
          >
            More cities coming soon
          </p>
        </div>
      </div>
    </div>
  )
}
