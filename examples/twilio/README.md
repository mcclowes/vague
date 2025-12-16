# Twilio Communications API

Test data generation for Twilio's communications platform.

## What It Models

- **Phone Numbers** with capabilities and status
- **Messaging Services** with configuration
- **SMS/MMS Messages** with delivery status
- **Voice Calls** with duration and outcomes
- **Recordings & Transcriptions**
- **Verification Services** for 2FA
- **Usage Records** for billing

## Key Lessons

### Communication Status Workflows
Realistic message delivery statuses:
```vague
status: 0.7: "delivered" | 0.1: "sent" | 0.08: "failed" | 0.05: "undelivered"
```

### Conditional Constraints
Failed messages must have error codes:
```vague
assume if status == "failed" or status == "undelivered" {
  error_code != null
}
```

### Completed Calls Have Duration
```vague
assume if status == "completed" {
  duration > 0
}
```

### Filtered References
Recordings only for completed calls:
```vague
call_sid: any of calls where .status == "completed"
```

### Negative Pricing
Twilio uses negative amounts for charges:
```vague
price: decimal in -0.01..-0.10
```

### Verification Channels
```vague
channel: 0.7: "sms" | 0.2: "call" | 0.08: "email" | 0.02: "whatsapp"
```

## Running

```bash
node dist/cli.js examples/twilio/communications.vague -p
```

**Note:** This example uses faker shorthand functions that require the faker plugin.
