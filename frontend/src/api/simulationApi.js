// Single source of truth for server field names.
// Components and hooks consume the normalized shape only.
// If the backend renames a field, fix it here — nowhere else.

// ─────────────────────────── Normalizer ─────────────────────────────

function normalizeStrategy(s) {
  if (!s) return null
  return {
    businessName: s.business_name,
    tagline: s.tagline,
    positioning: s.positioning ?? '',
    menu: s.menu ?? [],
    targetDemographic: s.target_demographic_summary ?? '',
    competitiveAdvantage: s.competitive_advantage ?? '',
  }
}

function normalizeStats(s) {
  if (!s) return null
  return {
    interestRate: s.overall_interest_rate,
    avgSentimentScore: s.avg_sentiment_score,
    projectedDailyCustomers: s.projected_daily_customers,
    projectedDailyRevenue: s.projected_daily_revenue,
    topConcerns: s.top_concerns ?? [],
    topStrengths: s.top_strengths ?? [],
    sentimentDistribution: s.sentiment_distribution ?? {},
  }
}

export function normalizeSnapshot(raw) {
  return {
    phase: raw.phase,
    strategy: normalizeStrategy(raw.strategy),
    personas: (raw.personas ?? []).map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      occupation: p.occupation,
      annualIncome: p.annual_income,
      priceSensitivity: p.price_sensitivity,
      dietaryRestrictions: p.dietary_restrictions ?? [],
      sentiment: p.sentiment ?? null,
      feedback: p.feedback ?? null,
      wouldVisit: p.would_visit ?? null,
      likelyOrder: p.likely_order ?? null,
    })),
    stats: normalizeStats(raw.stats),
    // Multi-strategy evaluation fields
    strategyOptions: (raw.strategy_options ?? []).map(normalizeStrategy),
    testingIndex:    raw.testing_index  ?? null,
    totalStrategies: raw.total_strategies ?? null,
    winnerIndex:     raw.winner_index   ?? null,
    winnerRationale: raw.winner_rationale ?? null,
    strategyResults: (raw.strategy_results ?? []).map(r => ({
      strategy: normalizeStrategy(r.strategy),
      stats:    normalizeStats(r.stats),
      isWinner: r.is_winner ?? false,
    })),
  }
}

// ──────────────────────── Live SSE connection ────────────────────────

export function connectToSimulation(concept, location, onSnapshot, onError) {
  const params = new URLSearchParams({ concept, location })
  const es = new EventSource(`/api/simulate?${params}`)

  es.onmessage = event => {
    try {
      onSnapshot(normalizeSnapshot(JSON.parse(event.data)))
    } catch (err) {
      onError(err)
    }
  }

  es.onerror = err => {
    onError(err)
    es.close()
  }

  return () => es.close()
}

// ──────────────────────────── Mock data ──────────────────────────────

const MOCK_STRATEGY = {
  business_name: 'Baja Suns',
  tagline: 'Fresh Baja-style tacos with a Utah twist',
  menu: [
    { name: 'Carne Asada Taco',   base_price: 4.50, category: 'tacos',  tags: ['spicy'] },
    { name: 'Fish Taco',           base_price: 5.00, category: 'tacos',  tags: [] },
    { name: 'Veggie Burrito Bowl', base_price: 8.50, category: 'bowls',  tags: ['vegetarian', 'gluten-free'] },
    { name: 'Chicken Quesadilla',  base_price: 9.00, category: 'mains',  tags: [] },
    { name: 'Chips & Guac',        base_price: 3.50, category: 'sides',  tags: ['vegetarian', 'gluten-free'] },
    { name: 'Horchata',            base_price: 3.00, category: 'drinks', tags: ['vegetarian'] },
  ],
}

const MOCK_STATS = {
  overall_interest_rate: 0.55,
  avg_sentiment_score: 0.62,
  projected_daily_customers: 47,
  projected_daily_revenue: 423.5,
  top_concerns: [
    'Price point above student budget',
    'Limited options for dietary restrictions',
    'Parking availability at proposed location',
  ],
  top_strengths: [
    'Unique flavor profile not available locally',
    'Fast service fits lunch break timing',
    'Strong appeal to working professionals',
  ],
  sentiment_distribution: { excited: 20, positive: 35, neutral: 25, negative: 15, hostile: 5 },
}

function buildMockPersonas() {
  const firstNames = [
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Jackson', 'Sophia', 'Lucas',
    'Isabella', 'Oliver', 'Mia', 'Ethan', 'Charlotte', 'Aiden', 'Amelia',
    'James', 'Harper', 'Benjamin', 'Evelyn', 'Mason', 'Wei', 'Mei', 'Priya',
    'Raj', 'Jose', 'Maria', 'Carlos', 'Ana', 'Yuki', 'Kenji',
  ]
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Hernandez', 'Chen',
    'Kim', 'Patel', 'Nguyen', 'Jensen', 'Lopez', 'Lee', 'Clark',
  ]
  const occupations = [
    'BYU student', 'UVU student', 'software engineer', 'elementary school teacher',
    'dental hygienist', 'startup founder', 'registered nurse', 'real estate agent',
    'data analyst', 'barista', 'restaurant server', 'freelance graphic designer',
    'small business owner', 'attorney', 'construction foreman', 'physical therapist',
    'accountant', 'UX designer', 'retired teacher', 'doordash driver',
  ]
  const sensitivities = ['low', 'low', 'medium', 'medium', 'medium', 'high']
  const restrictionSets = [
    [], [], [], [], [], [], [], [],
    ['vegetarian'], ['vegetarian'], ['vegetarian'],
    ['vegan'],
    ['gluten-free'], ['gluten-free'],
    ['vegetarian', 'gluten-free'],
  ]
  const orders = [
    'Carne Asada Taco', 'Fish Taco', 'Veggie Burrito Bowl',
    'Chicken Quesadilla', 'Chips & Guac', 'Horchata',
  ]
  const feedbackBySentiment = {
    excited: [
      "I'd visit every day — this is exactly what downtown needs!",
      "Perfect for my lunch break, can't wait to try it!",
      "Finally some real flavor around here!",
      "This is going to be my new favorite spot, 100%.",
    ],
    positive: [
      "Looks tasty, I'd definitely try it out.",
      "Good price point for the area, will visit regularly.",
      "Menu options work for me, nice variety.",
      "Would swing by on weekdays for sure.",
    ],
    neutral: [
      "Might try it once to see what the hype is about.",
      "Not really my usual cuisine but seems fine.",
      "Depends on the wait time, honestly.",
      "Maybe if I'm already in the area.",
    ],
    negative: [
      "Prices seem a bit high for a food truck.",
      "Limited options that fit my diet.",
      "I prefer what's already around here.",
      "Probably wouldn't go out of my way for this.",
    ],
    hostile: [
      "Not interested at all — we have enough food trucks.",
      "Too expensive for what it is.",
      "Would never visit, not my thing.",
      "This area doesn't need another taco truck.",
    ],
  }

  // Build a sentiment pool (100 entries) and deterministically shuffle it
  const sentimentPool = [
    ...Array(20).fill('excited'),
    ...Array(35).fill('positive'),
    ...Array(25).fill('neutral'),
    ...Array(15).fill('negative'),
    ...Array(5).fill('hostile'),
  ]
  for (let i = sentimentPool.length - 1; i > 0; i--) {
    const j = (i * 48271 + 7919) % sentimentPool.length
    ;[sentimentPool[i], sentimentPool[j]] = [sentimentPool[j], sentimentPool[i]]
  }

  const base = []
  const sentimentMap = {}

  for (let i = 0; i < 100; i++) {
    const id = i < 20
      ? `seed-${String(i + 1).padStart(3, '0')}`
      : `exp-${String(i - 19).padStart(3, '0')}`
    const sentiment = sentimentPool[i]
    const feedbacks = feedbackBySentiment[sentiment]

    base.push({
      id,
      name: `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / firstNames.length) % lastNames.length]}`,
      age: 18 + (i * 7 + 3) % 52,
      occupation: occupations[i % occupations.length],
      annual_income: 20000 + (i * 1337 + 500) % 100000,
      price_sensitivity: sensitivities[i % sensitivities.length],
      dietary_restrictions: restrictionSets[i % restrictionSets.length],
    })

    sentimentMap[id] = {
      sentiment,
      feedback: feedbacks[i % feedbacks.length],
      would_visit: sentiment === 'excited' || sentiment === 'positive',
      likely_order: orders[i % orders.length],
    }
  }

  return { base, sentimentMap }
}

const { base: MOCK_BASE, sentimentMap: MOCK_SENTIMENT_MAP } = buildMockPersonas()

function makePersonas(totalShown, revealedCount) {
  return MOCK_BASE.slice(0, totalShown).map((p, i) => ({
    ...p,
    ...(i < revealedCount
      ? MOCK_SENTIMENT_MAP[p.id]
      : { sentiment: null, feedback: null, would_visit: null, likely_order: null }),
  }))
}

// ─────────────────────────── Mock connector ──────────────────────────

const MOCK_STRATEGIES = [
  {
    business_name: 'Comet Tacos', tagline: 'Street tacos, student prices', positioning: 'value',
    menu: [
      { name: 'Classic Street Taco', base_price: 3.50, tags: ['spicy'] },
      { name: 'Black Bean Taco',     base_price: 3.75, tags: ['vegetarian', 'vegan'] },
      { name: 'Loaded Burrito',      base_price: 8.50, tags: [] },
      { name: 'Horchata',            base_price: 3.00, tags: ['vegetarian'] },
      { name: 'Chips & Salsa',       base_price: 2.50, tags: ['vegetarian', 'gluten-free'] },
    ],
    target_demographic_summary: 'Budget-conscious BYU students and staff.',
    pricing_rationale: 'Low price point drives volume near campus.',
    operating_hours: '11am-8pm', location_rationale: 'Near campus foot traffic.',
    competitive_advantage: 'Cheapest tacos within a mile of campus.', version: 1,
  },
  {
    business_name: 'Solis Kitchen', tagline: 'Elevated Mexican street food', positioning: 'premium',
    menu: [
      { name: 'Wagyu Birria Taco',      base_price: 9.00,  tags: [] },
      { name: 'Roasted Veggie Taco',    base_price: 7.50,  tags: ['vegetarian'] },
      { name: 'Smoked Brisket Burrito', base_price: 14.00, tags: [] },
      { name: 'Elote Cup',              base_price: 5.00,  tags: ['vegetarian', 'gluten-free'] },
      { name: 'Agua Fresca',            base_price: 4.50,  tags: ['vegetarian', 'gluten-free'] },
    ],
    target_demographic_summary: 'Professionals and foodies who pay for quality.',
    pricing_rationale: 'Premium ingredients justify higher price point.',
    operating_hours: '11am-8pm', location_rationale: 'Tech corridor lunch crowd.',
    competitive_advantage: 'Only wagyu birria truck in Utah Valley.', version: 1,
  },
  {
    business_name: 'Green Wheel', tagline: '100% plant-based Mexican', positioning: 'niche',
    menu: [
      { name: 'Jackfruit Carnitas Taco',  base_price: 5.50, tags: ['vegan', 'gluten-free'] },
      { name: 'Black Bean Chorizo Bowl',  base_price: 9.00, tags: ['vegan', 'gluten-free'] },
      { name: 'Cauliflower Al Pastor',    base_price: 5.00, tags: ['vegan'] },
      { name: 'Elote Fries',              base_price: 4.50, tags: ['vegan', 'gluten-free'] },
      { name: 'Horchata Oat Latte',       base_price: 4.00, tags: ['vegan'] },
    ],
    target_demographic_summary: 'Vegans, vegetarians, and health-conscious diners.',
    pricing_rationale: 'Specialty positioning supports mid-range prices.',
    operating_hours: '11am-8pm', location_rationale: 'Near yoga studios and gyms.',
    competitive_advantage: 'Only all-vegan Mexican truck in Provo.', version: 1,
  },
]

// Different sentiment distributions per strategy (affects dot colors)
const STRATEGY_SENTIMENTS = [
  // value: moderate excitement, high volume
  [...Array(20).fill('excited'), ...Array(33).fill('positive'), ...Array(27).fill('neutral'), ...Array(15).fill('negative'), ...Array(5).fill('hostile')],
  // premium: lower reach, higher when excited
  [...Array(12).fill('excited'), ...Array(23).fill('positive'), ...Array(28).fill('neutral'), ...Array(25).fill('negative'), ...Array(12).fill('hostile')],
  // niche: polarized
  [...Array(28).fill('excited'), ...Array(17).fill('positive'), ...Array(15).fill('neutral'), ...Array(22).fill('negative'), ...Array(18).fill('hostile')],
]

function buildSentimentMap(strategyIdx) {
  const pool = STRATEGY_SENTIMENTS[strategyIdx]
  // deterministic shuffle seeded by strategyIdx
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((i + 1) * 48271 * (strategyIdx + 1) + 7919) % shuffled.length
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const orders = MOCK_STRATEGIES[strategyIdx].menu.map(m => m.name)
  const feedbackBySentiment = {
    excited: ["I'd visit every day!", "Perfect for my lunch break!", "Finally some real flavor!", "This is my new favorite spot."],
    positive: ["Looks tasty, I'd try it.", "Good price for the area.", "Would swing by on weekdays.", "Solid menu options."],
    neutral: ["Might try it once.", "Not really my usual cuisine.", "Depends on the wait time.", "Maybe if I'm nearby."],
    negative: ["A bit pricey for me.", "Limited options that fit my diet.", "Probably wouldn't go out of my way.", "Prefer what's already here."],
    hostile: ["Not interested at all.", "Too expensive.", "We have enough food trucks.", "Would never visit."],
  }
  const map = {}
  for (let i = 0; i < 100; i++) {
    const id = i < 20 ? `seed-${String(i + 1).padStart(3, '0')}` : `exp-${String(i - 19).padStart(3, '0')}`
    const sentiment = shuffled[i]
    const feedbacks = feedbackBySentiment[sentiment]
    map[id] = {
      sentiment,
      feedback: feedbacks[i % feedbacks.length],
      would_visit: sentiment === 'excited' || sentiment === 'positive',
      likely_order: orders[i % orders.length],
    }
  }
  return map
}

const STRATEGY_SENTIMENT_MAPS = [0, 1, 2].map(buildSentimentMap)

function makePersonasForStrategy(totalShown, revealedCount, strategyIdx) {
  const sentMap = STRATEGY_SENTIMENT_MAPS[strategyIdx]
  return MOCK_BASE.slice(0, totalShown).map((p, i) => ({
    ...p,
    ...(i < revealedCount
      ? sentMap[p.id]
      : { sentiment: null, feedback: null, would_visit: null, likely_order: null }),
  }))
}

export function connectMock(_concept, _location, onSnapshot, _onError) {
  const timeouts = []
  const at = (ms, payload) =>
    timeouts.push(setTimeout(() => onSnapshot(normalizeSnapshot(payload)), ms))

  const opts = MOCK_STRATEGIES

  // Phase 1: strategies loading + ready
  at(0,    { phase: 'strategy', strategy: null, personas: [], stats: null, strategy_options: [] })
  at(1200, { phase: 'strategy', strategy: opts[0], personas: [], stats: null, strategy_options: opts })

  // Phase 2: personas appearing (10 batches × 400ms)
  for (let b = 0; b < 10; b++) {
    at(1800 + b * 400, {
      phase: 'personas', strategy: opts[0],
      personas: makePersonas((b + 1) * 10, 0),
      stats: null, strategy_options: opts,
    })
  }

  // Phase 3: test each strategy (4s each)
  const testStart = 6000
  const testDuration = 4000

  for (let si = 0; si < 3; si++) {
    const base = testStart + si * testDuration

    // Reset — show all personas with no reactions
    at(base, {
      phase: 'testing', strategy: opts[si],
      personas: makePersonasForStrategy(100, 0, si),
      stats: null, strategy_options: opts,
      testing_index: si, total_strategies: 3,
    })

    // Reveal reactions in 5 waves (every 700ms)
    for (let w = 0; w < 5; w++) {
      at(base + 400 + w * 650, {
        phase: 'testing', strategy: opts[si],
        personas: makePersonasForStrategy(100, (w + 1) * 20, si),
        stats: null, strategy_options: opts,
        testing_index: si, total_strategies: 3,
      })
    }
  }

  // Phase 4: evaluating
  const evalStart = testStart + 3 * testDuration + 200
  at(evalStart, {
    phase: 'evaluating', strategy: null,
    personas: makePersonasForStrategy(100, 100, 0),
    stats: null, strategy_options: opts, total_strategies: 3,
  })

  // Phase 5: complete — value strategy wins
  const mockStats = [
    { ...MOCK_STATS, overall_interest_rate: 0.55, projected_daily_revenue: 423, avg_sentiment_score: 0.62,
      sentiment_distribution: { excited: 20, positive: 33, neutral: 27, negative: 15, hostile: 5 } },
    { ...MOCK_STATS, overall_interest_rate: 0.35, projected_daily_revenue: 510, avg_sentiment_score: 0.28,
      sentiment_distribution: { excited: 12, positive: 23, neutral: 28, negative: 25, hostile: 12 } },
    { ...MOCK_STATS, overall_interest_rate: 0.45, projected_daily_revenue: 350, avg_sentiment_score: 0.44,
      sentiment_distribution: { excited: 28, positive: 17, neutral: 15, negative: 22, hostile: 18 } },
  ]
  at(evalStart + 1200, {
    phase: 'complete', strategy: opts[0],
    personas: makePersonasForStrategy(100, 100, 0),
    stats: mockStats[0],
    strategy_options: opts,
    testing_index: 0,
    total_strategies: 3,
    winner_index: 0,
    winner_rationale: 'Comet Tacos wins: 55% customer interest and $423/day projected revenue.',
    strategy_results: opts.map((s, i) => ({ strategy: s, stats: mockStats[i], is_winner: i === 0 })),
  })

  return () => timeouts.forEach(clearTimeout)
}
