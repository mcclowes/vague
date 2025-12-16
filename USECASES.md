# Imaginative Applications of Vague

Here are creative and practical applications across different domains:

## Testing & Quality Assurance

### 1. **Chaos Engineering for Data Pipelines**
```vague
dataset ChaosScenarios violating {
  // Generate data that breaks your ETL pipeline
  malformed_records: 1000 * Record,
  // Test graceful degradation
  edge_cases: 500 * EdgeCase
}
```
Use violating datasets to stress-test error handling, retry logic, and alerting systems.

### 2. **API Contract Testing at Scale**
Import your OpenAPI spec and generate thousands of valid requests to verify your API handles the full contract—not just the happy path you tested manually.

### 3. **Database Migration Dry Runs**
Generate production-like data volumes before migrations to catch performance issues and constraint violations before they hit real users.

---

## Finance & Fintech

### 4. **Fraud Detection Training Data**
```vague
schema Transaction {
  amount: = lognormal(4.5, 1.2, 1, 50000),  // Real spending patterns
  merchant: any of merchants,
  timestamp: = datetime(2023, 2024),
  is_fraud: 0.02: true | 0.98: false  // 2% fraud rate
}
then {
  // Fraudulent transactions cluster in time
  assume if is_fraud { amount > 500 }
}
```
Generate realistic transaction patterns with known fraud labels for ML model training.

### 5. **Reconciliation Testing**
```vague
schema Payment {
  invoice: any of invoices where .status != "paid",
  amount: 0.7: invoice.total | 0.2: int in 1..invoice.total | 0.1: invoice.total + int in 1..50
}
then {
  invoice.amount_paid += amount,
  invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partial"
}
```
Test partial payments, overpayments, and complex multi-payment scenarios.

### 6. **Portfolio Stress Testing**
Generate market scenarios with correlated price movements using gaussian distributions to test portfolio risk models.

---

## Healthcare

### 7. **EHR System Testing**
```vague
schema Patient {
  mrn: unique sequence("MRN-", 100000),
  dob: date in 1940..2023,
  conditions: 0..5 * Diagnosis,
  medications: 0..10 * Medication,

  assume if age < 18 { not any(medications, .controlled == true) }
}
```
Generate HIPAA-safe synthetic patient records that maintain clinical realism (no controlled substances for minors, realistic age-condition correlations).

### 8. **Clinical Trial Simulation**
Model patient cohorts with realistic dropout rates, adverse events, and efficacy distributions before running actual trials.

---

## Gaming & Simulation

### 9. **Procedural World Population**
```vague
schema NPC {
  name: faker.person.firstName(),
  profession: "blacksmith" | "merchant" | "guard" | "farmer",
  wealth: = profession == "merchant" ? gaussian(500, 100, 100, 2000) : gaussian(50, 20, 10, 200),
  inventory: (profession == "merchant" ? 10..30 : 1..5) * Item,
  relationships: 2..8 * Relationship
}
```
Generate entire towns with economically coherent NPCs.

### 10. **Leaderboard & Matchmaking Testing**
```vague
schema Player {
  skill_rating: = gaussian(1500, 300, 500, 2500),  // Elo-like distribution
  games_played: = poisson(50),
  win_rate: = beta(skill_rating / 100, (3000 - skill_rating) / 100)
}
```
Generate realistic player populations to test ranking algorithms and matchmaking balance.

---

## E-commerce

### 11. **Abandoned Cart Analysis**
```vague
schema ShoppingSession {
  items: 1..10 * CartItem,
  completed: 0.3: true | 0.7: false,  // 70% abandonment
  abandon_stage: = not completed ? ("browse" | "cart" | "checkout" | "payment") : null
}
```
Generate funnel data to test analytics dashboards and retargeting logic.

### 12. **Inventory Edge Cases**
Test race conditions: generate concurrent orders that compete for the last item in stock.

---

## Data Science & ML

### 13. **Synthetic Training Data**
When real data is sensitive (medical, financial, PII), generate statistically similar synthetic datasets that preserve patterns without privacy risks.

### 14. **Imbalanced Dataset Generation**
```vague
schema SupportTicket {
  category: 0.6: "billing" | 0.25: "technical" | 0.1: "feature_request" | 0.05: "security",
  priority: = category == "security" ? "critical" : ("low" | "medium" | "high")
}
```
Create intentionally imbalanced datasets to test model robustness.

### 15. **Time Series Anomaly Detection**
```vague
schema SensorReading {
  timestamp: = sequenceInt("ts", 1000),
  value: = gaussian(100, 5, 80, 120),
  is_anomaly: 0.01: true | 0.99: false
}
then {
  assume if is_anomaly { value > 150 or value < 50 }
}
```
Generate sensor data with known anomalies for training/validating detection systems.

---

## Enterprise & SaaS

### 16. **Multi-Tenant Isolation Testing**
```vague
schema Tenant { id: unique uuid() }
schema Document {
  tenant: any of tenants,
  data: string,
  // Cross-tenant reference bug detection
  shared_with: 0.1: any of tenants | 0.9: null
}
```
Generate multi-tenant data to verify isolation boundaries.

### 17. **Demo Environment Seeding**
Create compelling, realistic demo data for sales presentations—complete with believable company names, transaction histories, and growth metrics.

### 18. **GDPR Compliance Testing**
Generate PII-like data (faker integration) to test anonymization pipelines, data deletion workflows, and export functionality.

---

## DevOps & Infrastructure

### 19. **Log Analysis Pipeline Testing**
```vague
schema LogEntry {
  timestamp: = datetime("2024-01-01", "2024-01-31"),
  level: 0.7: "INFO" | 0.2: "WARN" | 0.08: "ERROR" | 0.02: "FATAL",
  service: "auth" | "api" | "worker" | "db",
  latency_ms: = level == "ERROR" ? exponential(0.01, 1000, 30000) : exponential(0.1, 10, 500)
}
```
Generate realistic log volumes to test Elasticsearch queries, alerting thresholds, and dashboard performance.

### 20. **Capacity Planning**
Model growth scenarios: "What happens when we have 10x users with this access pattern?"

---

## Education & Training

### 21. **Student Information System Testing**
```vague
schema Student {
  gpa: = gaussian(3.0, 0.5, 0.0, 4.0),
  courses: 3..6 * Enrollment,
  financial_aid: = gpa >= 3.5 ? "scholarship" : (gpa >= 2.0 ? "loan" : "none")
}
```

### 22. **Training Simulations**
Generate realistic business scenarios for employee training without exposing real customer data.

---

## IoT & Embedded

### 23. **Device Fleet Simulation**
```vague
schema Device {
  id: unique sequence("DEV-", 1),
  firmware: "1.0.0" | "1.1.0" | "2.0.0",
  battery: = gaussian(75, 20, 5, 100),
  last_seen: = daysAgo(poisson(2)),
  status: = battery < 10 ? "critical" : (last_seen > daysAgo(7) ? "offline" : "online")
}
```
Test device management dashboards and alerting with realistic fleet distributions.

---

## Summary: Why Vague Shines

| Application | Key Vague Features Used |
|------------|------------------------|
| Fraud detection | Weighted superposition, distributions, then blocks |
| Healthcare | Constraints, conditional logic, unique IDs |
| Gaming | Ternary expressions, dynamic cardinality |
| ML training | Statistical distributions, violating datasets |
| Multi-tenant | Cross-references, unique constraints |
| Time series | Sequential generation, previous() |
| API testing | OpenAPI import, validation |

The common thread: **realistic complexity with declarative simplicity**. Instead of writing imperative code to generate test data, you declare the shape and relationships, and Vague handles the rest.
