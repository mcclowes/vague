# GitHub API

Test data generation for GitHub's repository and collaboration objects.

## What It Models

- **Users & Organizations** with profiles and stats
- **Repositories** with branches, topics, and settings
- **Issues & Pull Requests** with labels, milestones, and assignees
- **Commits & Reviews** with verification status
- **Workflow Runs** for CI/CD simulation
- **Releases** with semantic versioning

## Key Lessons

### Union Types for Ownership
A repository can be owned by either a user or an organization:
```vague
owner: any of users | any of organizations
```

### Conditional Constraints
PRs that are merged must have a merged_at timestamp:
```vague
assume if state == "closed" and merged == true {
  merged_at != null
}
```

### Side Effects for Issue Tracking
Comments increment the issue's comment count:
```vague
schema Comment {
  issue: any of issues,
  body: faker.lorem.paragraph()
} then {
  issue.comments += 1
}
```

### Realistic Language Distribution
```vague
language: 0.25: "JavaScript" | 0.2: "Python" | 0.15: "TypeScript" | 0.1: "Go" | 0.1: "Rust"
```

## Running

```bash
node dist/cli.js examples/github/repositories.vague -p
```

**Note:** This example uses faker shorthand functions that require the faker plugin.
