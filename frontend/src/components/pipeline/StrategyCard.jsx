import { motion, AnimatePresence } from 'framer-motion'

function StrategySkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4 animate-pulse">
      {/* Business name + tagline */}
      <div className="space-y-2">
        <div className="h-6 bg-gray-800 rounded w-2/5" />
        <div className="h-4 bg-gray-800 rounded w-3/5" />
      </div>
      {/* Menu label */}
      <div className="h-3 bg-gray-800 rounded w-12" />
      {/* Menu grid — 6 items */}
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 bg-gray-700 rounded w-3/5" />
              <div className="h-4 bg-gray-700 rounded w-1/5" />
            </div>
            <div className="h-3 bg-gray-700 rounded w-2/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StrategyCard({ strategy, phase }) {
  const isLoading = phase !== 'idle' && !strategy

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <StrategySkeleton />
        </motion.div>
      ) : strategy ? (
        <motion.div
          key="content"
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4"
        >
          <div>
            <h2 className="text-xl font-bold text-white">{strategy.businessName}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{strategy.tagline}</p>
          </div>

          {strategy.menu?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Menu
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {strategy.menu.map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white truncate">{item.name}</span>
                      <span className="text-sm text-emerald-400 shrink-0">
                        ${Number(item.base_price).toFixed(2)}
                      </span>
                    </div>
                    {item.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
