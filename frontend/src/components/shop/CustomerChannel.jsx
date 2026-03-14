import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CHANNEL_THEME = {
  walk_up: {
    accent: 'bg-emerald-600',
    accentHover: 'hover:bg-emerald-500',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    aiBubble: 'bg-emerald-900/40 text-emerald-100 rounded-bl-sm',
  },
  text_order: {
    accent: 'bg-blue-600',
    accentHover: 'hover:bg-blue-500',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    aiBubble: 'bg-blue-900/40 text-blue-100 rounded-bl-sm',
  },
  escalation: {
    accent: 'bg-red-600',
    accentHover: 'hover:bg-red-500',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    aiBubble: 'bg-red-900/40 text-red-100 rounded-bl-sm',
  },
}

function MessageBubble({ message, channel }) {
  const theme = CHANNEL_THEME[channel] ?? CHANNEL_THEME.walk_up
  const isCustomer = message.role === 'customer'
  const isSms = channel === 'text_order'

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] px-3.5 py-2 text-sm ${
          isCustomer
            ? `bg-gray-700 text-gray-200 ${isSms ? 'rounded-2xl rounded-br-sm' : 'rounded-xl rounded-br-sm'}`
            : `${theme.aiBubble} ${isSms ? 'rounded-2xl' : 'rounded-xl'}`
        }`}
      >
        {message.text}
      </div>
    </motion.div>
  )
}

export default function CustomerChannel({
  channel = 'walk_up',
  title = 'Channel',
  messages = [],
  onSend,
  isEscalation = false,
  automationActive = false,
}) {
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const theme = CHANNEL_THEME[channel] ?? CHANNEL_THEME.walk_up

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSend?.(text, channel)
    setInput('')
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h3>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${theme.badge}`}>
          {channel === 'walk_up' ? 'Walk-up' : channel === 'text_order' ? 'SMS' : 'Escalation'}
        </span>
        {isEscalation && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
            ESCALATION
          </span>
        )}
        {automationActive && !isEscalation && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            AI AUTO
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2.5 min-h-0 mb-3 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-600 text-center mt-8"
            >
              {isEscalation ? 'No escalations yet.' : automationActive ? 'AI is populating this lane in real time...' : 'Waiting for customers...'}
            </motion.p>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} channel={channel} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isEscalation ? 'Respond to escalation...' : 'Type a message...'}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className={`${theme.accent} ${theme.accentHover} disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
        >
          Send
        </button>
      </form>
    </div>
  )
}
