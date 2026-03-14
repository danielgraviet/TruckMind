import { motion } from 'framer-motion'

// Mounts above a PersonaAvatar, animates upward while fading out, then self-destructs
// via AnimatePresence in the parent.
export default function ThoughtBubble({ emoji }) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 0.8 }}
      animate={{ y: -44, opacity: 0, scale: 1.2 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="absolute -top-1 left-1/2 -translate-x-1/2 text-xl pointer-events-none z-20 select-none"
    >
      {emoji}
    </motion.div>
  )
}
