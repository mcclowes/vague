---
sidebar_position: 2
title: Sequences
---

# Sequences

Vague provides sequential and ordered generation for IDs, codes, and cyclical values.

## String Sequences

Generate auto-incrementing strings with a prefix:

```vague
schema Invoice {
  // "INV-1001", "INV-1002", "INV-1003", ...
  id: sequence("INV-", 1001)
}
```

### Sequence Parameters

- First argument: Prefix string
- Second argument: Starting number (optional, defaults to 1)

```vague
schema Examples {
  order: sequence("ORD-", 1),       // ORD-1, ORD-2, ...
  ticket: sequence("TKT-", 10000),  // TKT-10000, TKT-10001, ...
  ref: sequence("REF"),             // REF1, REF2, ...
}
```

## Integer Sequences

Generate auto-incrementing integers:

```vague
schema Record {
  // 1, 2, 3, 4, ...
  row_number: sequenceInt("records"),

  // 100, 101, 102, ...
  id: sequenceInt("ids", 100)
}
```

### Named Sequences

The first argument is a sequence name. Multiple fields can share or have separate sequences:

```vague
schema Data {
  // Same sequence
  primary: sequenceInt("main"),    // 1
  secondary: sequenceInt("main"),  // 2

  // Different sequence
  other: sequenceInt("other")      // 1
}
```

## Ordered Sequences (Cycling Lists)

Cycle through a fixed list of values:

```vague
schema Note {
  // Cycles: 48, 52, 55, 60, 48, 52, ...
  pitch: [48, 52, 55, 60]
}

schema Light {
  // Cycles: red, green, blue, red, ...
  color: ["red", "green", "blue"]
}
```

### With Expressions

Ordered sequences can contain expressions:

```vague
schema Math {
  // Cycles: 2, 4, 6, 2, 4, 6, ...
  value: [1+1, 2+2, 3+3]
}
```

## Previous Record Reference

Access the previous record's field value:

```vague
schema TimeSeries {
  value: int in 1..100,

  // Previous record's value (null for first record)
  prev_value: previous("value"),

  // Change from previous
  delta: prev_value != null ? value - prev_value : 0
}
```

## Practical Examples

### Invoice Numbers

```vague
schema Invoice {
  id: uuid(),
  number: sequence("INV-", 2024001),
  date: today(),
  amount: decimal in 100..10000
}

dataset Q1Invoices {
  invoices: 100 of Invoice
}
// Generates INV-2024001 through INV-2024100
```

### Row Numbering

```vague
schema ExportRow {
  row_num: sequenceInt("export"),
  data: faker.lorem.sentence()
}

dataset Export {
  rows: 1000 of ExportRow
}
```

### Musical Notes

```vague
schema Chord {
  // C major arpeggio pattern
  notes: 4 of Note
}

schema Note {
  midi: [60, 64, 67, 72],  // C-E-G-C
  velocity: int in 64..127,
  duration: 0.25 | 0.5 | 1.0
}
```

### Traffic Lights

```vague
schema Intersection {
  id: uuid(),
  lights: 10 of LightState
}

schema LightState {
  color: ["green", "yellow", "red"],
  duration: color == "green" ? 30 :
            color == "yellow" ? 5 : 25
}
```

### Time Series with Trend

```vague
schema StockPrice {
  day: sequenceInt("day"),
  price: int in 90..110,

  // Random walk from previous
  prev_price: previous("price"),
  adjusted_price: prev_price != null ?
    prev_price + int in -5..5 :
    price
}
```

### Batch Processing

```vague
schema Batch {
  batch_id: sequence("BATCH-", 1),
  items: 10..50 of BatchItem
}

schema BatchItem {
  // Item number within batch
  item_num: sequenceInt("items"),
  status: "pending" | "processed"
}
```

## Tips

1. **Reset sequences per dataset** — Sequences reset when generating a new dataset
2. **Use named sequences** — For independent counters
3. **Combine with prefixes** — For human-readable IDs
4. **Order matters** — Cycling lists follow generation order
