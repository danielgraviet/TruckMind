import { motion } from 'framer-motion'

// Small inline SVG sentiment faces — no emoji, no external deps
const FACES = {
  excited: { color: '#34d399', path: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm-2 6.5c.7.9 1.4 1.3 2 1.3s1.3-.4 2-1.3M6.5 7h.01M9.5 7h.01' },
  positive: { color: '#6ee7b7', path: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm-1.5 6c.4.6 1 1 1.5 1s1.1-.4 1.5-1M6.5 7h.01M9.5 7h.01' },
  neutral:  { color: '#9ca3af', path: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm-1.5 7h3M6.5 7h.01M9.5 7h.01' },
  negative: { color: '#fbbf24', path: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm-1.5 8c.4-.6 1-1 1.5-1s1.1.4 1.5 1M6.5 7h.01M9.5 7h.01' },
  hostile:  { color: '#f87171', path: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm-1.5 8c.4-.6 1-1 1.5-1s1.1.4 1.5 1M5.5 6.5l1 1M10.5 6.5l-1 1' },
}

export default function ThoughtBubble({ sentiment }) {
  const face = FACES[sentiment] ?? FACES.neutral
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 0.8 }}
      animate={{ y: -44, opacity: 0, scale: 1.2 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none z-20 select-none"
    >
      <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke={face.color} strokeWidth="1.2" strokeLinecap="round">
        <path d={face.path} />
      </svg>
    </motion.div>
  )
}
