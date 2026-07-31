---
sidebar_position: 4
title: Date Functions
---

# Date Functions

Vague provides functions for generating and manipulating dates and timestamps.

## Current Time

### now()

Full ISO 8601 timestamp:

```vague
schema Event {
  created_at: now()
}
// Output: "2024-03-15T10:30:45.123Z"
```

### today()

Current date only:

```vague
schema Record {
  date: today()
}
// Output: "2024-03-15"
```

## Relative Dates

### daysAgo() / daysFromNow()

Generate dates relative to now:

```vague
schema Activity {
  // 30 days in the past
  last_login: daysAgo(30),

  // 90 days in the future
  expiry: daysFromNow(90)
}
```

## Random Dates

### datetime()

Random datetime within year range:

```vague
schema Event {
  // Random datetime in 2020-2024
  occurred_at: datetime(2020, 2024)
}
```

### dateBetween()

Random date between specific dates:

```vague
schema Project {
  // Random date in Q1 2024
  start_date: dateBetween("2024-01-01", "2024-03-31")
}
```

## Date Formatting

### formatDate()

Format dates with custom patterns:

```vague
schema Report {
  timestamp: now(),

  // Custom formats
  date_only: formatDate(timestamp, "YYYY-MM-DD"),
  us_format: formatDate(timestamp, "MM/DD/YYYY"),
  time_only: formatDate(timestamp, "HH:mm:ss"),
  full: formatDate(timestamp, "YYYY-MM-DD HH:mm")
}
```

Format tokens:
- `YYYY` - 4-digit year
- `MM` - 2-digit month
- `DD` - 2-digit day
- `HH` - 2-digit hour (24h)
- `mm` - 2-digit minute
- `ss` - 2-digit second

## Date Arithmetic

Add or subtract durations from dates:

```vague
schema Invoice {
  issued_date: date in 2024..2024,

  // Due 30 days after issued
  due_date: issued_date + date.days(30),

  // Reminder 7 days before due
  reminder_date: due_date - date.days(7)
}
```

### Duration Functions

| Function | Description |
|----------|-------------|
| `date.days(n)` | n days |
| `date.weeks(n)` | n weeks |
| `date.months(n)` | n months |
| `date.years(n)` | n years |

```vague
schema Contract {
  start_date: date in 2024..2024,

  // 1 year later
  end_date: start_date + date.years(1),

  // First payment 1 month after start
  first_payment: start_date + date.months(1),

  // Reviews every 3 months
  first_review: start_date + date.weeks(13)
}
```

## Practical Examples

### Subscription Lifecycle

```vague
schema Subscription {
  created_at: datetime(2023, 2024),

  // Trial ends 14 days after creation
  trial_ends_at: created_at + date.days(14),

  // Billing starts after trial
  first_billing_date: trial_ends_at + date.days(1),

  // Renewal 1 month after billing starts
  next_renewal: first_billing_date + date.months(1)
}
```

### Project Timeline

```vague
schema Project {
  name: faker.company.buzzPhrase(),
  start_date: dateBetween("2024-01-01", "2024-06-30"),

  // Milestones
  design_complete: start_date + date.weeks(2),
  development_complete: design_complete + date.weeks(6),
  testing_complete: development_complete + date.weeks(2),
  launch_date: testing_complete + date.weeks(1)
}
```

### Event Scheduling

```vague
schema Event {
  type: "conference" | "webinar" | "workshop",

  // Scheduled in the future
  event_date: daysFromNow(int in 7..90),

  // Registration opens 30 days before
  registration_opens: event_date - date.days(30),

  // Early bird ends 14 days before
  early_bird_ends: event_date - date.days(14),

  // Reminder 1 day before
  reminder_date: event_date - date.days(1)
}
```

### Audit Logs

```vague
schema AuditLog {
  timestamp: datetime(2024, 2024),
  action: "create" | "update" | "delete",
  user: any of users,

  // Human-readable
  formatted: formatDate(timestamp, "YYYY-MM-DD HH:mm:ss")
}
```

### Date Validation

Use dates in constraints:

```vague
schema Booking {
  check_in: dateBetween("2024-06-01", "2024-12-31"),
  check_out: dateBetween("2024-06-01", "2024-12-31"),

  assume check_out > check_in,
  assume check_out <= check_in + date.days(30)  // Max 30 nights
}
```

## Function Reference

| Function | Description | Returns |
|----------|-------------|---------|
| `now()` | Current timestamp | ISO datetime |
| `today()` | Current date | ISO date |
| `daysAgo(n)` | n days ago | ISO datetime |
| `daysFromNow(n)` | n days ahead | ISO datetime |
| `datetime(yearStart, yearEnd)` | Random in year range | ISO datetime |
| `dateBetween(start, end)` | Random between dates | ISO date |
| `formatDate(date, format)` | Format date | Formatted string |
| `date.days(n)` | Duration: n days | Duration |
| `date.weeks(n)` | Duration: n weeks | Duration |
| `date.months(n)` | Duration: n months | Duration |
| `date.years(n)` | Duration: n years | Duration |

## See Also

- [Dates Plugin](/docs/plugins/dates) for day-of-week filtering
- [Constraints](/docs/language/constraints) for date comparisons
