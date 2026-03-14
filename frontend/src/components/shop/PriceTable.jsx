export default function PriceTable({ menu = [], currentPrices = {} }) {
  if (!menu.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Price Table</h3>
        <p className="text-gray-600 text-sm">No menu loaded.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Current Prices</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-left pb-2">Item</th>
            <th className="text-right pb-2">Base</th>
            <th className="text-right pb-2">Current</th>
            <th className="text-right pb-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {menu.map((item) => {
            const base = item.base_price ?? item.basePrice ?? 0
            const current = currentPrices[item.name] ?? base
            const pct = base > 0 ? ((current - base) / base) * 100 : 0
            const color = pct > 0 ? 'text-green-400' : pct < 0 ? 'text-red-400' : 'text-gray-500'
            return (
              <tr key={item.name} className="border-b border-gray-800/50">
                <td className="py-1.5 text-white">{item.name}</td>
                <td className="py-1.5 text-right text-gray-400">${base.toFixed(2)}</td>
                <td className="py-1.5 text-right text-white font-medium">${current.toFixed(2)}</td>
                <td className={`py-1.5 text-right ${color}`}>
                  {pct === 0 ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
