import { useState, useEffect, useMemo } from 'react'

const DEFAULT_RULES = {
  max_markup_pct: 0.25,
  min_margin_multiplier: 1.10,
  min_cash_reserve: 50,
  max_restock_spend_pct: 0.50,
  cooldown_orders: 8,
  periodic_review_interval: 5,
  min_orders_for_trends: 8,
  max_actions_per_cycle: 2,
  category_inventory: {
    entree:  { qty: 10, threshold: 4, max: 50 },
    side:    { qty: 8,  threshold: 3, max: 30 },
    drink:   { qty: 15, threshold: 4, max: 50 },
    dessert: { qty: 6,  threshold: 3, max: 25 },
  },
}

function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, suffix = '%', displayMultiplier = 100 }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-400">{label}</label>
        <span className="text-xs text-gray-300 tabular-nums">{(value * displayMultiplier).toFixed(0)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value * displayMultiplier}
        onChange={(e) => onChange(parseFloat(e.target.value) / displayMultiplier)}
        className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  )
}

function NumberField({ label, value, onChange, min, max, step = 1, prefix = '' }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-gray-500">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>
    </div>
  )
}

function CategoryRow({ category, values, onChange }) {
  const update = (field, val) => {
    onChange({ ...values, [field]: val })
  }

  return (
    <div className="grid grid-cols-4 gap-2 items-center">
      <span className="text-xs text-gray-300 capitalize">{category}</span>
      <input
        type="number"
        value={values.qty}
        min={0}
        onChange={(e) => update('qty', parseInt(e.target.value) || 0)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-indigo-500"
      />
      <input
        type="number"
        value={values.threshold}
        min={0}
        onChange={(e) => update('threshold', parseInt(e.target.value) || 0)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-indigo-500"
      />
      <input
        type="number"
        value={values.max}
        min={0}
        onChange={(e) => update('max', parseInt(e.target.value) || 0)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}

export default function RulesForm({ rules: externalRules, onSave }) {
  const initialRules = useMemo(() => ({ ...DEFAULT_RULES, ...externalRules }), [externalRules])
  const [local, setLocal] = useState(initialRules)

  useEffect(() => {
    setLocal({ ...DEFAULT_RULES, ...externalRules })
  }, [externalRules])

  const isDirty = JSON.stringify(local) !== JSON.stringify(initialRules)

  const set = (key, val) => setLocal((prev) => ({ ...prev, [key]: val }))
  const setCategoryInventory = (category, val) =>
    setLocal((prev) => ({
      ...prev,
      category_inventory: { ...prev.category_inventory, [category]: val },
    }))

  const handleSave = () => {
    onSave?.(local)
  }

  const handleReset = () => {
    setLocal(initialRules)
  }

  return (
    <div className="space-y-4">
      {/* Card 1: Pricing & Margins */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Pricing & Margins</h3>
        <div className="space-y-4">
          <SliderField
            label="Max Markup %"
            value={local.max_markup_pct}
            onChange={(v) => set('max_markup_pct', v)}
          />
          <NumberField
            label="Min Margin Multiplier"
            value={local.min_margin_multiplier}
            onChange={(v) => set('min_margin_multiplier', v)}
            min={1.0}
            max={2.0}
            step={0.05}
          />
          <NumberField
            label="Min Cash Reserve"
            value={local.min_cash_reserve}
            onChange={(v) => set('min_cash_reserve', v)}
            min={0}
            prefix="$"
          />
        </div>
      </div>

      {/* Card 2: Operations */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Operations</h3>
        <div className="grid grid-cols-2 gap-4">
          <SliderField
            label="Max Restock Spend %"
            value={local.max_restock_spend_pct}
            onChange={(v) => set('max_restock_spend_pct', v)}
          />
          <NumberField
            label="Cooldown Orders"
            value={local.cooldown_orders}
            onChange={(v) => set('cooldown_orders', v)}
            min={1}
            max={50}
          />
          <NumberField
            label="Review Interval (orders)"
            value={local.periodic_review_interval}
            onChange={(v) => set('periodic_review_interval', v)}
            min={1}
            max={50}
          />
          <NumberField
            label="Min Orders for Trends"
            value={local.min_orders_for_trends}
            onChange={(v) => set('min_orders_for_trends', v)}
            min={1}
            max={50}
          />
          <NumberField
            label="Max Actions per Cycle"
            value={local.max_actions_per_cycle}
            onChange={(v) => set('max_actions_per_cycle', v)}
            min={1}
            max={10}
          />
        </div>
      </div>

      {/* Card 3: Inventory Defaults */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Inventory Defaults</h3>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 text-[10px] text-gray-500 uppercase tracking-wider">
            <span>Category</span>
            <span className="text-center">Default Qty</span>
            <span className="text-center">Threshold</span>
            <span className="text-center">Max Qty</span>
          </div>
          {Object.entries(local.category_inventory ?? {}).map(([cat, vals]) => (
            <CategoryRow
              key={cat}
              category={cat}
              values={vals}
              onChange={(v) => setCategoryInventory(cat, v)}
            />
          ))}
        </div>
      </div>

      {/* Save / Reset buttons */}
      {isDirty && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
