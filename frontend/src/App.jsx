import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PipelinePage from './pages/PipelinePage.jsx'
import LaunchTransitionPage from './pages/LaunchTransitionPage.jsx'
import ShopPage from './pages/ShopPage.jsx'

export default function App() {
  const [appPage, setAppPage] = useState('research') // 'research' | 'launching' | 'shop'
  const [businessData, setBusinessData] = useState(null)

  const handleLaunch = (strategy, stats, mockMode) => {
    setBusinessData({ strategy, stats, mockMode })
    setAppPage('launching')
  }

  const handleEnterShop = () => setAppPage('shop')

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg-base)' }}>
      {appPage === 'research' && (
        <header className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>TruckMind</span>
            <span className="text-sm ml-1" style={{ color: 'var(--text-3)' }}>AI Food Truck Simulator</span>
          </div>
        </header>
      )}
      <AnimatePresence mode="wait">
        {appPage === 'research' && (
          <motion.div
            key="research"
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeIn' }}
          >
            <PipelinePage onLaunch={handleLaunch} />
          </motion.div>
        )}
        {appPage === 'launching' && (
          <LaunchTransitionPage
            key="launching"
            strategy={businessData?.strategy}
            stats={businessData?.stats}
            onComplete={handleEnterShop}
          />
        )}
        {appPage === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
          >
            <ShopPage strategy={businessData?.strategy} stats={businessData?.stats} forceMock={businessData?.mockMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
