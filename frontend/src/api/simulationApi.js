// Single source of truth for server field names.
// Components and hooks consume the normalized shape only.
// If the backend renames a field, fix it here — nowhere else.

// ─────────────────────────── Normalizer ─────────────────────────────

export function normalizeSnapshot(raw) {
  return {
    phase: raw.phase,
    strategy: raw.strategy
      ? {
          businessName: raw.strategy.business_name,
          tagline: raw.strategy.tagline,
          menu: raw.strategy.menu ?? [],
        }
      : null,
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
    stats: raw.stats
      ? {
          interestRate: raw.stats.overall_interest_rate,
          avgSentimentScore: raw.stats.avg_sentiment_score,
          projectedDailyCustomers: raw.stats.projected_daily_customers,
          projectedDailyRevenue: raw.stats.projected_daily_revenue,
          topConcerns: raw.stats.top_concerns ?? [],
          topStrengths: raw.stats.top_strengths ?? [],
          sentimentDistribution: raw.stats.sentiment_distribution ?? {},
        }
      : null,
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

export function connectMock(_concept, _location, onSnapshot, _onError) {
  const timeouts = []
  const at = (ms, payload) =>
    timeouts.push(setTimeout(() => onSnapshot(normalizeSnapshot(payload)), ms))

  // Strategy loading
  at(0,   { phase: 'strategy', strategy: null,          personas: [],                    stats: null })
  at(800, { phase: 'strategy', strategy: MOCK_STRATEGY, personas: [],                    stats: null })

  // Crowd generation — 10 batches of 10 personas, 200ms apart
  for (let b = 0; b < 10; b++) {
    at(1200 + b * 200, {
      phase: 'personas',
      strategy: MOCK_STRATEGY,
      personas: makePersonas((b + 1) * 10, 0),
      stats: null,
    })
  }

  // Simulation starts — all 100 personas, none revealed
  at(3200, {
    phase: 'simulation',
    strategy: MOCK_STRATEGY,
    personas: makePersonas(100, 0),
    stats: null,
  })

  // Tier 1: reveal 5 per event, 400ms apart (10 events → 50 personas)
  for (let b = 0; b < 10; b++) {
    at(3600 + b * 400, {
      phase: 'simulation',
      strategy: MOCK_STRATEGY,
      personas: makePersonas(100, (b + 1) * 5),
      stats: null,
    })
  }

  // Tier 2 burst: 3 rapid events covering remaining 50
  at(7900, { phase: 'simulation', strategy: MOCK_STRATEGY, personas: makePersonas(100, 67), stats: null })
  at(8100, { phase: 'simulation', strategy: MOCK_STRATEGY, personas: makePersonas(100, 84), stats: null })
  at(8300, { phase: 'simulation', strategy: MOCK_STRATEGY, personas: makePersonas(100, 100), stats: null })

  // Complete
  at(8700, {
    phase: 'complete',
    strategy: MOCK_STRATEGY,
    personas: makePersonas(100, 100),
    stats: MOCK_STATS,
  })

  return () => timeouts.forEach(clearTimeout)
}
