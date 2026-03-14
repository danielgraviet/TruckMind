import PipelinePage from './pages/PipelinePage.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🚚</span>
          <span className="text-xl font-bold tracking-tight">TruckMind</span>
          <span className="text-gray-500 text-sm ml-2">AI Food Truck Simulator</span>
        </div>
      </header>
      <PipelinePage />
    </div>
  )
}
