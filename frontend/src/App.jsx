import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PipelinePage from './pages/PipelinePage.jsx'
import LaunchTransitionPage from './pages/LaunchTransitionPage.jsx'
import ShopPage from './pages/ShopPage.jsx'

export default function App() {
  const [appPage, setAppPage] = useState('research') // 'research' | 'launching' | 'shop'
  const [businessData, setBusinessData] = useState(null)

  const handleLaunch = (strategy, stats) => {
    setBusinessData({ strategy, stats })
    setAppPage('launching')
  }

  const handleEnterShop = () => setAppPage('shop')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {appPage === 'research' && (
        <header className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="text-2xl">🚚</span>
            <span className="text-xl font-bold tracking-tight">TruckMind</span>
            <span className="text-gray-500 text-sm ml-2">AI Food Truck Simulator</span>
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
            <ShopPage strategy={businessData?.strategy} stats={businessData?.stats} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
