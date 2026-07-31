---
sidebar_position: 1
title: Statistical Distributions
---

# Statistical Distributions

Vague supports statistical distributions for generating realistic data patterns beyond uniform randomness.

## Available Distributions

### Gaussian (Normal)

Bell curve distribution with mean, standard deviation, and optional bounds:

```vague
schema Person {
  // Mean: 35, StdDev: 10, Min: 18, Max: 65
  age: gaussian(35, 10, 18, 65)
}
```

Most values cluster around the mean, with fewer at the extremes.

### Log-Normal

For values that are multiplicatively distributed (incomes, prices):

```vague
schema Income {
  // Mu: 10.5, Sigma: 0.5, Min: 20000, Max: 500000
  salary: lognormal(10.5, 0.5, 20000, 500000)
}
```

Produces right-skewed distributions with a long tail.

### Exponential

For time-between-events, waiting times:

```vague
schema Event {
  // Rate: 0.5, Min: 0, Max: 60
  wait_time: exponential(0.5, 0, 60)
}
```

Many small values, fewer large values.

### Poisson

For count data (events per time period):

```vague
schema Day {
  // Lambda (average): 5
  orders: poisson(5)
}
```

Returns integers clustered around lambda.

### Beta

For probabilities and proportions (0-1 range):

```vague
schema Experiment {
  // Alpha: 2, Beta: 5
  conversion_rate: beta(2, 5)
}
```

Useful for modeling rates and percentages.

### Uniform

Explicit uniform distribution (same as range):

```vague
schema Data {
  // Min: 0, Max: 100
  value: uniform(0, 100)
}
```

## Practical Examples

### Realistic Ages

```vague
schema Employee {
  // Most employees 25-45, some younger/older
  age: gaussian(35, 8, 22, 65)
}

schema Customer {
  // Wider age distribution
  age: gaussian(40, 15, 18, 85)
}
```

### Income Distribution

```vague
schema Household {
  // Right-skewed income
  income: lognormal(10.8, 0.6, 25000, 1000000),

  // Tax bracket based on income
  tax_bracket: income < 40000 ? "low" :
               income < 100000 ? "middle" : "high"
}
```

### Event Timing

```vague
schema Request {
  // Time between requests (seconds)
  interval: exponential(2, 0.1, 30),

  timestamp: daysAgo(0)
}
```

### Daily Counts

```vague
schema DailySales {
  date: date in 2024..2024,

  // ~20 orders per day on average
  order_count: poisson(20),

  // ~5 returns per day
  return_count: poisson(5)
}
```

### Conversion Rates

```vague
schema Campaign {
  name: faker.company.buzzPhrase(),

  // Click-through rate (typically 1-5%)
  ctr: beta(2, 50),

  // Conversion rate (typically 1-10%)
  conversion: beta(2, 20)
}
```

## Distribution Parameters

| Distribution | Parameters | Range |
|-------------|------------|-------|
| `gaussian(mean, stddev, min, max)` | Mean, standard deviation, bounds | [min, max] |
| `lognormal(mu, sigma, min, max)` | Log-mean, log-stddev, bounds | [min, max] |
| `exponential(rate, min, max)` | Rate (λ), bounds | [min, max] |
| `poisson(lambda)` | Average rate | [0, ∞) integers |
| `beta(alpha, beta)` | Shape parameters | [0, 1] |
| `uniform(min, max)` | Bounds | [min, max] |

## Combining with Weights

Mix distributions with superposition:

```vague
schema Salary {
  // 80% normal distribution, 20% outliers
  amount: 0.8: gaussian(50000, 15000, 30000, 80000) |
          0.2: gaussian(120000, 30000, 90000, 250000)
}
```

## Tips

1. **Use bounds** — Gaussian and lognormal can produce extreme values
2. **Match real data** — Fit distribution parameters to your domain
3. **Combine distributions** — Use weighted superposition for multi-modal data
4. **Test edge cases** — Ensure your application handles distribution extremes
