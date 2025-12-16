# Vague Built-in Functions

## Aggregate Functions

Used in computed fields to aggregate collection values:

```vague
sum(items.amount)      // Sum of all amounts
count(items)           // Number of items
avg(items.price)       // Average price
min(items.price)       // Minimum price
max(items.price)       // Maximum price
```

## Decimal Precision

```vague
round(value, decimals)   // Round to N decimal places
floor(value, decimals)   // Floor to N decimal places
ceil(value, decimals)    // Ceiling to N decimal places
```

Example:
```vague
tax: = round(subtotal * 0.2, 2)
```

## Date Functions

```vague
// Current date/time
now()                    // Full ISO 8601: "2025-01-15T10:30:00.000Z"
today()                  // Date only: "2025-01-15"

// Relative dates
daysAgo(30)              // 30 days in the past
daysFromNow(90)          // 90 days in the future

// Random datetime within range
datetime(2020, 2024)                           // Years
datetime("2023-01-01", "2023-12-31")           // ISO strings

// Random date between two dates
dateBetween("2023-06-01", "2023-06-30")

// Format dates (YYYY, MM, DD, HH, mm, ss)
formatDate(now(), "YYYY-MM-DD HH:mm")
```

## Sequential/Stateful Functions

```vague
// Auto-incrementing string IDs
sequence("INV-", 1001)         // "INV-1001", "INV-1002", ...

// Auto-incrementing integers
sequenceInt("orders", 100)     // 100, 101, 102, ...
sequenceInt("orders")          // 1, 2, 3, ... (default start: 1)

// Reference previous record in collection
previous("amount")             // null for first record
```

Example for sequential coherence:
```vague
schema TimeSeries {
  timestamp: int in 1000..2000,
  prev_ts: = previous("timestamp"),
  delta: = timestamp - (previous("timestamp") ?? timestamp)
}
```

## Statistical Distributions

```vague
// Normal/Gaussian - for natural measurements
gaussian(mean, stddev, min, max)
// Example: gaussian(35, 10, 18, 65)

// Log-normal - for right-skewed data (income, prices)
lognormal(mu, sigma, min, max)
// Example: lognormal(10.5, 0.5, 20000, 500000)

// Exponential - for wait times, decay
exponential(rate, min, max)
// Example: exponential(0.5, 0, 60)

// Poisson - for count data (events per period)
poisson(lambda)
// Example: poisson(5)

// Beta - for probabilities and proportions (0-1 range)
beta(alpha, beta)
// Example: beta(2, 5)

// Uniform - explicit uniform distribution
uniform(min, max)
// Example: uniform(0, 100)
```

## Predicate Functions (Dataset Validation)

Used in `validate { }` blocks:

```vague
all(collection, .field > 0)    // All items must satisfy
some(collection, .status == "paid")  // At least one must satisfy
none(collection, .total < 0)   // No items should satisfy
```
