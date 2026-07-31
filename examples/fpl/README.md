# Fantasy Premier League Example

This example generates realistic Fantasy Premier League (FPL) data, based on the official FPL API structure.

## Usage

```bash
node dist/cli.js examples/fpl/fpl.vague
```

## Data Structure

The schema generates:

- **20 Teams** - Premier League teams with standings, strength ratings, and form
- **4 Positions** - GKP, DEF, MID, FWD with squad rules
- **100 Players** - With stats like goals, assists, points, ICT index, and selection %
- **10 Gameweeks** - With deadlines, average scores, and chip usage

## Features Demonstrated

- **Unique superposition**: Team names and short names are unique across records
- **Computed fields**: Points calculated as `win * 3 + draw`
- **Conditional constraints**: Goalkeepers have low goal counts, forwards have few clean sheets
- **Weighted distributions**: Position types reflect real squad composition (more midfielders/defenders)
- **Faker integration**: Player names generated with faker
- **Date functions**: Gameweek deadlines use `datetime()` for realistic timestamps
- **String functions**: Gameweek names use `concat("Gameweek ", id)`

## Sample Output

```json
{
  "teams": [
    {
      "id": 1,
      "name": "Arsenal",
      "short_name": "ARS",
      "strength": 4,
      "played": 28,
      "win": 15,
      "draw": 6,
      "loss": 7,
      "points": 51,
      "position": 3
    }
  ],
  "players": [
    {
      "id": 1,
      "first_name": "Mohamed",
      "second_name": "Salah",
      "web_name": "Salah",
      "team": 12,
      "element_type": 3,
      "now_cost": 130,
      "total_points": 245,
      "goals_scored": 23,
      "assists": 14
    }
  ]
}
```
