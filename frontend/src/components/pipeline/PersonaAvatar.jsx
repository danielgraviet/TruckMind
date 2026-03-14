import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SENTIMENT_COLORS } from '../../constants/sentiments.js'
import ThoughtBubble from './ThoughtBubble.jsx'

// Memoized — re-renders only when its own state changes.
const PersonaAvatar = React.memo(function PersonaAvatar({ persona, state, index }) {
  const [showBubble, setShowBubble] = useState(false)
  const prevSentiment = useRef(null)

  useEffect(() => {
    if (state?.sentiment && state.sentiment !== prevSentiment.current) {
      prevSentiment.current = state.sentiment
      setShowBubble(true)
      const timer = setTimeout(() => setShowBubble(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [state?.sentiment])

  const bgColor = state?.sentiment ? SENTIMENT_COLORS[state.sentiment] : '#374151'
  const initials = persona.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.015, type: 'spring', stiffness: 300, damping: 20 }}
      className="relative group"
    >
      {/* Avatar circle */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white cursor-default select-none"
        style={{
          backgroundColor: bgColor,
          transition: 'background-color 400ms ease',
        }}
      >
        {initials}
      </div>

      {/* Tooltip — visible on hover when sentiment is filled in */}
      {state?.sentiment && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 shadow-xl">
          <div className="font-semibold text-white truncate">{persona.name}</div>
          <div className="text-gray-400 mt-0.5">{persona.age} · {persona.occupation}</div>
          {state.feedback && (
            <div className="mt-1.5 text-gray-300 italic leading-relaxed">
              "{state.feedback}"
            </div>
          )}
          {state.likelyOrder && (
            <div className="mt-1.5 text-emerald-400">Would order: {state.likelyOrder}</div>
          )}
        </div>
      )}

      {/* Floating thought bubble */}
      <AnimatePresence>
        {showBubble && state?.sentiment && (
          <ThoughtBubble key="bubble" sentiment={state.sentiment} />
        )}
      </AnimatePresence>
    </motion.div>
  )
})

export default PersonaAvatar
