# Slack API

Test data generation for Slack's workspace and messaging platform.

## What It Models

- **Teams (Workspaces)** with plans and settings
- **Users** with profiles, presence, and permissions
- **Channels** with topics, purposes, and membership
- **Messages** with threads, reactions, and attachments
- **Files** with sharing and permissions
- **Apps & Bots** with integrations
- **User Groups** for team organization

## Key Lessons

### Complex Profile Objects
Users have nested profile schemas:
```vague
schema User {
  profile: UserProfile,
  is_admin: 0.1: true | 0.9: false
}
```

### Threaded Conversations
Replies reference parent message timestamps:
```vague
thread_ts: any of messages.ts
```

### Multiple Reaction Types
```vague
schema Reaction {
  name: "thumbsup" | "heart" | "joy" | "fire" | "eyes",
  count: int in 1..50,
  users: 1..10 * uuid()
}
```

### Side Effects for Unread Counts
Messages increment channel unread counts:
```vague
schema Message {
  channel: any of channels
} then {
  channel.unread_count += 1
}
```

### Timezone Handling
```vague
tz: "America/Los_Angeles" | "America/New_York" | "Europe/London",
tz_offset: -28800 | -18000 | 0 | 32400
```

## Running

```bash
node dist/cli.js examples/slack/workspace.vague -p
```

**Note:** This example uses faker shorthand functions that require the faker plugin.
