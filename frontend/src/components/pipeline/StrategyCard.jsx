import { motion, AnimatePresence } from 'framer-motion'

export default function StrategyCard({ strategy }) {
  return (
    <AnimatePresence>
      {strategy && (
        <motion.div
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
      )}
    </AnimatePresence>
  )
}
