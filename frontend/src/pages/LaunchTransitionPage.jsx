import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Food Truck SVG ────────────────────────────────────────────────────────────

const TRUCK_PATHS = [
  // Main body
  'M 20 120 L 20 60 Q 20 50 30 50 L 200 50 Q 210 50 210 60 L 210 120 Z',
  // Cab section
  'M 210 120 L 210 65 Q 210 55 220 55 L 280 55 Q 290 60 295 75 L 300 120 Z',
  // Serving window opening
  'M 60 70 L 60 100 L 160 100 L 160 70 Z',
  // Awning
  'M 50 70 L 50 62 L 170 62 L 170 70',
  // Awning stripes (decorative)
  'M 80 62 L 80 70 M 110 62 L 110 70 M 140 62 L 140 70',
  // Chassis / bottom rail
  'M 15 120 L 310 120',
  // Front wheel
  'M 255 120 m -28 0 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0',
  // Rear wheel
  'M 80 120 m -28 0 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0',
  // Wheel hub front
  'M 255 120 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0',
  // Wheel hub rear
  'M 80 120 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0',
  // Steam wisp 1
  'M 100 50 Q 95 38 100 28 Q 105 18 100 8',
  // Steam wisp 2
  'M 120 50 Q 115 36 120 24 Q 125 12 120 2',
  // Steam wisp 3
  'M 140 50 Q 145 36 140 24 Q 135 12 140 2',
]

function FoodTruckSVG({ onDrawComplete }) {
  return (
    <svg
      viewBox="0 -10 330 185"
      width="340"
      height="185"
      className="mx-auto drop-shadow-[0_0_18px_rgba(99,102,241,0.6)]"
    >
      {TRUCK_PATHS.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          stroke="#6366f1"
          strokeWidth={i >= 10 ? 1.5 : 2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.6, ease: 'easeInOut', delay: i * 0.055 },
            opacity: { duration: 0.2, delay: i * 0.055 },
          }}
          onAnimationComplete={i === TRUCK_PATHS.length - 1 ? onDrawComplete : undefined}
        />
      ))}
    </svg>
  )
}

// ── Animated Checkmark ────────────────────────────────────────────────────────

function AnimatedCheckmark({ delay, done }) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={done ? { scale: 1, opacity: 1 } : {}}
      transition={{ delay, duration: 0.3, type: 'spring', bounce: 0.5 }}
      className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-indigo-400 flex items-center justify-center"
      style={done ? { borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.15)' } : {}}
    >
      {done && (
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <motion.path
            d="M1 5 L4.5 8.5 L11 1"
            stroke="#4ade80"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay }}
          />
        </svg>
      )}
    </motion.div>
  )
}

// ── Checklist ─────────────────────────────────────────────────────────────────

const CHECKLIST = [
  { label: 'Stocking inventory & menu',      at: 1600 },
  { label: 'Configuring pricing engine',     at: 2200 },
  { label: 'Setting up order system',        at: 2800 },
  { label: 'Briefing the crew',              at: 3400 },
  { label: 'Opening the serving window',     at: 4000 },
]

// ── Business Name reveal ───────────────────────────────────────────────────────

function CharReveal({ text, startDelay = 800 }) {
  return (
    <span className="inline-flex flex-wrap justify-center gap-0">
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: startDelay / 1000 + i * 0.04, duration: 0.25 }}
          className={ch === ' ' ? 'w-2' : ''}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </span>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ allDone }) {
  return (
    <div className="w-64 h-0.5 rounded-full overflow-hidden mx-auto" style={{ background: 'var(--bg-card)' }}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: '0%' }}
        animate={allDone ? { width: '100%' } : { width: '0%' }}
        transition={{ duration: 2.8, ease: 'easeInOut', delay: 1.6 }}
        style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
      />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LaunchTransitionPage({ strategy, stats, onComplete }) {
  const [elapsed, setElapsed] = useState(0)
  const [drawDone, setDrawDone] = useState(false)
  const [exiting, setExiting] = useState(false)

  const businessName = strategy?.businessName ?? 'Your Food Truck'
  const tagline = strategy?.tagline ?? 'Great food, coming right up'

  // Tick elapsed time for checklist triggers
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - start), 50)
    return () => clearInterval(id)
  }, [])

  // Trigger exit + onComplete after 5 000 ms
  useEffect(() => {
    const id = setTimeout(() => {
      setExiting(true)
      setTimeout(onComplete, 400)
    }, 5000)
    return () => clearTimeout(id)
  }, [onComplete])

  const checkedCount = CHECKLIST.filter(item => elapsed >= item.at).length
  const allDone = checkedCount === CHECKLIST.length

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
      initial={{ opacity: 0 }}
      animate={exiting ? { opacity: 0, y: -60 } : { opacity: 1, y: 0 }}
      transition={exiting
        ? { duration: 0.4, ease: 'easeIn' }
        : { duration: 0.3, ease: 'easeOut' }
      }
    >
      {/* Radial glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 45%, rgba(201,241,53,0.08) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Truck */}
      <motion.div
        animate={allDone ? { y: [0, -10, 0] } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <FoodTruckSVG onDrawComplete={() => setDrawDone(true)} />
      </motion.div>

      {/* Business name */}
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white text-center px-4" style={{ fontFamily: 'var(--font-display)' }}>
        <CharReveal text={businessName} startDelay={800} />
      </h1>

      {/* Tagline */}
      <motion.p
        className="mt-2 text-base text-center px-6 max-w-sm"
        style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        {tagline}
      </motion.p>

      {/* Checklist */}
      <div className="mt-8 space-y-3 w-72">
        {CHECKLIST.map((item, i) => {
          const done = elapsed >= item.at
          return (
            <motion.div
              key={i}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -12 }}
              animate={done ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4 }}
            >
              <AnimatedCheckmark delay={0} done={done} />
              <span
                className="text-sm transition-colors duration-300"
                style={{ color: done ? 'var(--accent)' : 'var(--text-3)', fontFamily: 'var(--font-body)' }}
              >
                {item.label}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <ProgressBar allDone={allDone} />
      </div>

      {/* "Grand Opening" badge */}
      <motion.div
        className="mt-8 px-4 py-1.5 rounded-full text-xs tracking-widest uppercase"
        style={{
          border: '1px solid rgba(201,241,53,0.25)',
          color: 'var(--accent)',
          background: 'var(--accent-dim)',
          fontFamily: 'var(--font-body)',
        }}
        initial={{ opacity: 0 }}
        animate={allDone ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        Grand Opening
      </motion.div>
    </motion.div>
  )
}
