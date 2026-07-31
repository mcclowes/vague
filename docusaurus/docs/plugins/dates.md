---
sidebar_position: 3
title: Dates Plugin
---

# Dates Plugin

The Dates plugin provides day-of-week filtering for date generation, useful for business logic that depends on weekdays or weekends.

## Weekday Dates

Generate dates that fall on weekdays (Monday-Friday):

```vague
schema Meeting {
  // Only Monday-Friday
  scheduled_date: date.weekday(2024, 2025)
}
```

## Weekend Dates

Generate dates that fall on weekends (Saturday-Sunday):

```vague
schema Event {
  // Only Saturday-Sunday
  party_date: date.weekend(2024, 2025)
}
```

## Specific Day of Week

Generate dates for a specific day (0=Sunday through 6=Saturday):

```vague
schema Recurring {
  // Only Mondays
  monday_meeting: date.dayOfWeek(1, 2024, 2025),

  // Only Fridays
  friday_review: date.dayOfWeek(5, 2024, 2025),

  // Only Sundays
  sunday_brunch: date.dayOfWeek(0, 2024, 2025)
}
```

Day numbers:
| Day | Number |
|-----|--------|
| Sunday | 0 |
| Monday | 1 |
| Tuesday | 2 |
| Wednesday | 3 |
| Thursday | 4 |
| Friday | 5 |
| Saturday | 6 |

## ISO Date Ranges

Use ISO date strings instead of year numbers:

```vague
schema Q1Meeting {
  // Weekdays in Q1 2024
  date: date.weekday("2024-01-01", "2024-03-31")
}

schema SummerWeekend {
  // Weekends in summer 2024
  date: date.weekend("2024-06-01", "2024-08-31")
}
```

## Shorthand Syntax

These functions also work without the `date.` prefix:

```vague
schema Meeting {
  weekday_meeting: weekday(2024, 2025),
  weekend_event: weekend(2024, 2025)
}
```

## Practical Examples

### Business Meetings

```vague
schema BusinessMeeting {
  id: uuid(),
  title: faker.company.buzzPhrase(),

  // Meetings only on weekdays
  scheduled_date: date.weekday(2024, 2025),

  // Between 9 AM and 5 PM
  start_hour: int in 9..16,

  duration_minutes: 30 | 60 | 90
}
```

### Shift Scheduling

```vague
schema Shift {
  employee: any of employees,

  // Day shifts on weekdays
  date: date.weekday(2024, 2024),
  type: "morning" | "afternoon" | "evening",

  // Weekend premium
  is_weekend: false
}

schema WeekendShift {
  employee: any of employees,

  // Weekend shifts only
  date: date.weekend(2024, 2024),
  type: "day" | "night",

  // Weekend premium
  is_weekend: true,
  premium_rate: 1.5
}
```

### Recurring Events

```vague
schema WeeklyStandup {
  // Every Monday
  date: date.dayOfWeek(1, 2024, 2024),
  time: "09:00",
  duration: 15,
  title: "Daily Standup"
}

schema BiWeeklyReview {
  // Every other Friday
  date: date.dayOfWeek(5, 2024, 2024),
  time: "14:00",
  duration: 60,
  title: "Sprint Review"
}
```

### Delivery Windows

```vague
schema Delivery {
  order: any of orders,

  // Deliveries only on weekdays
  delivery_date: date.weekday(2024, 2024),

  // Morning or afternoon slot
  time_slot: "morning" | "afternoon",

  assume delivery_date >= order.created_date
}
```

## Combining with Constraints

```vague
schema Appointment {
  type: "regular" | "urgent",

  // Regular appointments on weekdays only
  date: type == "regular" ?
    date.weekday(2024, 2025) :
    date in 2024..2025,  // Urgent can be any day

  time: int in 9..17
}
```

## See Also

- [Date Functions](/docs/advanced/date-functions) for date arithmetic
- [Faker Plugin](/docs/plugins/faker) for random dates
