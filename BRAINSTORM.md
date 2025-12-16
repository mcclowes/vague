# Wild Language Feature Ideas

Experimental, unconventional ideas for Vague that push the boundaries of declarative data generation.

---

## 1. Quantum Superposition (Deferred Resolution)

Fields that don't collapse to a value until explicitly observed/referenced. Unlike current superposition which resolves immediately, these remain in a "fuzzy" state.

```vague
schema Particle {
  // Doesn't resolve until another field references it
  spin: lazy "up" | "down"

  // When this field is generated, spin finally resolves
  measured_spin: = observe(spin)

  // Multiple observations always return the same collapsed value
  confirmed_spin: = observe(spin)  // Same as measured_spin
}

// Cross-record entanglement
schema EntangledPair {
  particle_a: Particle,
  particle_b: Particle,

  // When A collapses, B becomes the opposite
  entangle particle_a.spin, particle_b.spin as opposite
}
```

---

## 2. Temporal Personas

Define behavioral archetypes that influence ALL data generation for related records. Like CSS classes but for data personality.

```vague
persona Procrastinator {
  // Probabilistic biases applied to any matching field
  *_date: bias +30.days,
  *_deadline: bias +14.days,
  status: bias toward "pending" | "draft",
  completion_rate: bias -0.3
}

persona Overachiever {
  *_date: bias -5.days,
  status: bias toward "completed" | "shipped",
  completion_rate: bias +0.2
}

schema Employee {
  persona: Procrastinator | Overachiever,  // 50/50

  // All dates and statuses automatically influenced by persona
  hire_date: date in 2020..2024,
  first_project_completed: date,
  review_status: "pending" | "completed" | "overdue"
}
```

---

## 3. Data Corruption & Decay

Simulate real-world data quality issues - the stuff that makes production databases nightmares.

```vague
schema User corrupted(0.05) {  // 5% of records have issues
  name: string,
  email: string format email,
  phone: string format phone,

  // Corruption strategies
  corrupt {
    truncate: 0.3,           // Random truncation
    encoding: 0.2,           // Mojibake: "José" → "JosÃ©"
    null_injection: 0.15,    // Random nulls in non-nullable fields
    type_coercion: 0.15,     // "123" instead of 123
    duplicate_char: 0.1,     // "helllo"
    swap_fields: 0.1         // email in phone field
  }
}

// Or field-level decay
schema HistoricalRecord {
  created: date in 1990..2024,

  // Older records more likely to have quality issues
  notes: string decay(age_from: created, rate: 0.01/year) {
    truncate,
    encoding_drift
  }
}
```

---

## 4. Narrative Arcs

Generate data that follows story structures - rising action, climax, resolution.

```vague
arc HeroJourney {
  stages: [
    "ordinary_world",
    "call_to_adventure",
    "refusal",
    "meeting_mentor",
    "crossing_threshold",
    "tests_allies_enemies",
    "approach",
    "ordeal",
    "reward",
    "road_back",
    "resurrection",
    "return_with_elixir"
  ]
}

schema CustomerLifecycle follows HeroJourney {
  // Fields automatically get stage-appropriate values
  stage: = arc.current_stage,

  // Different distributions per stage
  engagement_score: = arc.stage_value(
    ordinary_world: gaussian(50, 10),
    call_to_adventure: gaussian(65, 8),
    ordeal: gaussian(30, 15),  // Crisis point
    return_with_elixir: gaussian(90, 5)
  ),

  // Events clustered around stage transitions
  events: = arc.stage_events(1..3 * Event)
}

dataset CustomerJourneys {
  // Each customer follows the arc independently
  customers: 100 * CustomerLifecycle following HeroJourney
}
```

---

## 5. Adversarial Generation

Generate data specifically designed to break systems - for chaos engineering and security testing.

```vague
schema User adversarial {
  // Automatically generates edge cases and attack vectors
  name: string attack {
    sql_injection,      // "'; DROP TABLE users; --"
    xss,               // "<script>alert('xss')</script>"
    buffer_overflow,   // "A" * 10000
    unicode_exploit,   // RTL override, zero-width chars
    null_byte,         // "admin\x00.txt"
    format_string      // "%s%s%s%s%s"
  },

  email: string format email attack {
    header_injection,  // "user@example.com\r\nBcc: spam@evil.com"
    unicode_domain     // "user@еxample.com" (Cyrillic 'е')
  },

  age: int attack {
    boundary: [0, -1, 2147483647, -2147483648],
    type_confusion: ["NaN", "Infinity", "1e308"]
  }
}

// Or probabilistic chaos
schema APIPayload chaos(0.1) {
  // 10% of payloads are adversarial
  // 90% are normal
}
```

---

## 6. Multiverse Generation

Generate parallel timeline variations of the same dataset.

```vague
schema Company {
  founded: date in 2010..2020,
  initial_funding: decimal in 10000..1000000,

  // Branch points that create alternate timelines
  pivot_2015: boolean,
  acquired_2018: boolean
}

multiverse Scenarios {
  // Base timeline
  timeline baseline {
    companies: 50 * Company
  }

  // Fork: What if all companies pivoted?
  timeline all_pivoted from baseline {
    mutate companies where true {
      pivot_2015 = true,
      revenue = revenue * 1.5
    }
  }

  // Fork: Economic crash
  timeline recession_2020 from baseline {
    mutate companies {
      funding_2020 = funding_2020 * 0.3,
      employees = floor(employees * 0.6)
    }
  }

  // Parallel timeline comparison
  compare baseline, all_pivoted {
    metrics: [sum(revenue), avg(employees), count(where .status == "active")]
  }
}
```

---

## 7. Causal Event Chains

Define causal relationships that must be maintained across time.

```vague
causality PaymentFlow {
  // Events with causal dependencies
  Invoice.created -> Payment.possible,
  Payment.initiated -> Payment.processing,
  Payment.processing -> Payment.completed | Payment.failed,
  Payment.failed -> Payment.retry | Refund.initiated,

  // Temporal constraints
  Payment.completed must_follow Invoice.created by 1..90.days,
  Refund.completed must_follow Payment.completed by 1..30.days
}

schema Event {
  type: causality.valid_transitions_from(previous("type")),
  timestamp: date after previous("timestamp"),

  // Causal chain is automatically maintained
  assume causality.valid_sequence(events)
}
```

---

## 8. Emotional Valence

Generate text with specific emotional undertones.

```vague
schema Review {
  rating: int in 1..5,

  // Text emotion correlates with rating
  text: string emotion(
    1..2: "angry" | "disappointed",
    3: "neutral" | "mixed",
    4..5: "happy" | "enthusiastic"
  ) length(50..200),

  // Or explicit emotional targeting
  support_response: string emotion("empathetic", "professional")
}

// Emotion modifiers
schema Drama {
  monologue: string emotion("melancholic")
    intensity(0.8)           // How strongly expressed
    subtext("hopeful")       // Underlying emotion differs
}
```

---

## 9. Fractal / Self-Similar Data

Generate data with recursive patterns at multiple scales.

```vague
schema Organization fractal(depth: 4) {
  name: string,
  type: depth == 0 ? "corporation" :
        depth == 1 ? "division" :
        depth == 2 ? "department" : "team",

  // Each level contains similar structure
  headcount: = depth == 0 ? int in 1000..10000 :
               int in (parent.headcount / 5)..(parent.headcount / 3),

  budget: = parent.budget * uniform(0.1, 0.4),

  // Recursive children with diminishing size
  children: fractal.recurse(1..5 * Organization)
}

// Generates:
// Corporation (5000 people)
//   ├── Division A (1200 people)
//   │     ├── Dept A1 (300 people)
//   │     │     ├── Team A1a (80 people)
//   │     │     └── Team A1b (60 people)
//   │     └── Dept A2 (400 people)
//   └── Division B (800 people)
//         └── ...
```

---

## 10. Consensus / Multi-Agent Resolution

Multiple "agents" that negotiate field values.

```vague
agents {
  Optimist { bias: +20%, risk_tolerance: high },
  Pessimist { bias: -20%, risk_tolerance: low },
  Realist { bias: 0%, risk_tolerance: medium }
}

schema Forecast {
  // Value is negotiated between agents
  revenue_projection: decimal consensus(Optimist, Pessimist, Realist) {
    method: "median",        // or "mean", "weighted", "debate"
    rounds: 3,               // Negotiation rounds
    convergence: 0.1         // Stop when within 10%
  },

  // Record the disagreement
  confidence_interval: = consensus.spread,
  dissent: = consensus.minority_opinion
}
```

---

## 11. Memory & Learning

The generator "learns" patterns from what it generates.

```vague
schema Transaction learn {
  merchant: string,
  amount: decimal in 1..1000,
  category: "food" | "transport" | "entertainment" | "utilities",

  // After generating 100 records, learns:
  // - Which merchants associate with which categories
  // - Typical amounts per merchant
  // - Time patterns

  memory {
    associate merchant -> category,
    associate merchant -> amount_range,
    associate day_of_week -> category
  }
}

// Later records are more internally consistent
dataset Transactions {
  // First 100: random associations
  // Next 900: learned patterns applied
  transactions: 1000 * Transaction with_memory
}
```

---

## 12. Perspective / Point-of-View

Same underlying data, different representations based on observer.

```vague
schema Event {
  actual_time: datetime,
  actual_location: coordinates,
  participants: 1..5 * Person
}

perspective Witness {
  // Each witness has imperfect recall
  memory_accuracy: decimal in 0.6..0.95,

  view(Event) {
    reported_time: = actual_time + gaussian(0, 30.minutes) * (1 - memory_accuracy),
    reported_location: = actual_location + noise(memory_accuracy),
    reported_participants: = participants sample(memory_accuracy)
  }
}

schema PoliceReport {
  event: Event,
  witnesses: 3..5 * Witness,

  // Each witness account differs slightly
  accounts: = witnesses.map(w => w.view(event))
}
```

---

## 13. Regulatory Compliance Modes

Built-in awareness of data regulations.

```vague
schema Customer compliant(GDPR, CCPA, HIPAA) {
  name: string,
  email: string format email,
  ssn: string format ssn,
  medical_history: string,

  // Automatically:
  // - Generates valid consent records
  // - Creates audit trail entries
  // - Applies appropriate anonymization
  // - Generates retention policy metadata
}

// Export with compliance transformations
dataset Export {
  customers: 100 * Customer,

  export {
    format: "json",
    compliance: GDPR,
    transform {
      ssn: redact,
      medical_history: pseudonymize,
      email: hash(salt: env.SALT)
    }
  }
}
```

---

## 14. Glitch Aesthetics

Intentionally "broken" data for testing error handling UI.

```vague
schema UITestData glitch {
  // Values that stress UI rendering
  username: string glitch {
    zalgo: 0.1,              // Z̷̢̻̲͊a̸̱̎l̵͎̽g̷̱̈́o̸̙̊
    emoji_overload: 0.1,     // 🎉🎊🎁🎈🎉🎊🎁🎈
    rtl_injection: 0.1,      // Mixes left-to-right and right-to-left
    extreme_length: 0.1,     // 10000 characters
    invisible_chars: 0.1,    // Zero-width spaces, joiners
    newline_injection: 0.1,  // Embedded \n\r
    homoglyph: 0.1          // Looks like "admin" but isn't
  },

  avatar_url: url glitch {
    svg_bomb: 0.1,           // Billion laughs attack
    redirect_loop: 0.1,
    slow_response: 0.1,
    wrong_mime: 0.1
  }
}
```

---

## 15. Biodegradable Data

Data with built-in expiration that affects generation.

```vague
schema Session biodegradable(ttl: 24.hours) {
  token: string format uuid,
  created_at: = now(),
  expires_at: = now() + ttl,

  // Fields that "decay" as expiration approaches
  validity: = 1.0 - (age / ttl),

  // Probabilistically generate as already-expired
  generate_expired: 0.2  // 20% are past expiration
}

// Time-traveling generation
dataset SessionHistory {
  // Generate sessions as they would appear at different points in time
  sessions_now: 100 * Session at now(),
  sessions_yesterday: 100 * Session at now() - 1.day,
  sessions_next_week: 100 * Session at now() + 7.days
}
```

---

## 16. Soundex / Phonetic Clustering

Generate data that sounds similar for testing fuzzy matching.

```vague
schema DuplicateCandidates {
  // Cluster of similar-sounding names
  names: phonetic_cluster("Michael", variations: 5)
  // Generates: ["Michael", "Micheal", "Michel", "Mikhail", "Mitchell"]

  // Typo variations
  emails: typo_cluster("john.smith@example.com", distance: 2)
  // Generates variations within edit distance 2

  // OCR-style errors
  addresses: ocr_errors("123 Main Street")
  // Generates: "l23 Main Street", "123 Maln Street"
}
```

---

## 17. Synesthetic Data

Cross-modal associations - colors have sounds, numbers have feelings.

```vague
synesthesia ColorSound {
  "red" <-> frequency(440),      // A4
  "blue" <-> frequency(262),     // C4
  "green" <-> frequency(330),    // E4
}

schema Artwork {
  dominant_color: "red" | "blue" | "green",

  // Automatically derives associated audio frequency
  ambient_tone: = synesthesia(dominant_color),

  // Or reverse mapping
  color_from_music: = synesthesia.inverse(input_frequency)
}
```

---

## 18. Schrödinger Records

Records that exist in multiple states until queried.

```vague
schema QuantumUser {
  id: int,

  // Exists in superposition until specific query
  status: schrödinger {
    states: ["active", "suspended", "deleted"],
    collapse_on: query.includes("status")
  },

  // Different queries see different states
  // Until collapsed, all states are "true"
}

dataset QuantumDB {
  users: 100 * QuantumUser,

  // Query 1: "SELECT * FROM users" - status remains uncollapsed
  // Query 2: "SELECT * FROM users WHERE status = 'active'" - forces collapse
}
```

---

## 19. Data Terroir

Data influenced by its "origin" - like wine regions affect taste.

```vague
terroir SiliconValley {
  company_names: bias toward tech_buzzwords,
  salaries: multiplier(1.8),
  job_titles: bias toward "Engineer" | "Product Manager",
  founding_stories: template("Started in a garage...")
}

terroir WallStreet {
  company_names: bias toward financial_terms,
  salaries: multiplier(2.2),
  job_titles: bias toward "Analyst" | "Associate" | "VP",
  dress_code: always("business formal")
}

schema Startup {
  location: terroir SiliconValley | WallStreet | Generic,

  // All fields automatically influenced by terroir
  name: string,
  avg_salary: decimal,
  culture: string
}
```

---

## 20. Unreliable Narrator

Data that intentionally misrepresents itself.

```vague
narrator Unreliable {
  lie_probability: 0.3,
  exaggeration_factor: 1.5,
  omission_rate: 0.2,

  strategies: [
    "round_up",           // 847 -> "about 1000"
    "selective_memory",   // Omit unflattering data
    "false_precision",    // "exactly 47.3%" (made up)
    "category_shift"      // "several" when meaning "2"
  ]
}

schema SelfReportedMetrics narrator(Unreliable) {
  actual_revenue: decimal hidden,  // True value (not exported)
  reported_revenue: = narrate(actual_revenue),

  actual_users: int hidden,
  reported_users: = narrate(actual_users),  // Likely inflated

  // Metadata about the lies
  _truth_delta: = reported_revenue - actual_revenue
}
```

---

These ideas push Vague from "test data generator" toward "reality simulator." Some are practical (adversarial testing, data corruption), some are philosophical (quantum states, unreliable narrators), and some are just fun (synesthesia, glitch aesthetics).

The unifying theme: **data isn't just values—it has history, perspective, decay, intent, and imperfection.**
