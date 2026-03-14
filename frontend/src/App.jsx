import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Truck } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-950 text-white">
      {appPage === 'research' && (
        <header className="border-b border-gray-800/60 px-6 py-4 bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Truck className="w-5 h-5 text-indigo-400" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              TruckMind
            </span>
            <span className="hidden sm:block text-gray-600 text-sm ml-1">·</span>
            <span className="hidden sm:block text-gray-500 text-xs">AI Market Simulator</span>
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
