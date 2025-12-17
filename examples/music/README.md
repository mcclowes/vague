# Music Generation with Vague

This example demonstrates how Vague's declarative features map surprisingly well to music generation:

| Music Concept | Vague Feature |
|---------------|---------------|
| Notes in a scale | Weighted superposition |
| Melodic continuity | `previous()` + constraints |
| Rhythm patterns | Duration weights |
| Dynamics/humanization | `gaussian()` distribution |
| Song structure | Nested schemas + datasets |
| Chord progressions | Weighted root selection |

## Quick Start

```bash
# Generate a simple melody
node dist/cli.js examples/music/music.vague -d SimpleMelody --seed 42

# Generate a full song structure
node dist/cli.js examples/music/music.vague -d FullSong --seed 123

# Generate chord progressions
node dist/cli.js examples/music/music.vague -d ChordProgressions

# Generate drum patterns
node dist/cli.js examples/music/music.vague -d DrumPatterns

# Generate ambient texture
node dist/cli.js examples/music/music.vague -d Ambient
```

## Converting to MIDI

The `to-midi.ts` script converts the JSON output to playable MIDI files:

```bash
# Install the MIDI library
npm install midi-writer-js

# Generate and convert in one pipeline
node dist/cli.js examples/music/music.vague -d SimpleMelody --seed 42 | \
  npx tsx examples/music/to-midi.ts - melody.mid

# Or in two steps
node dist/cli.js examples/music/music.vague -d FullSong --seed 123 > song.json
npx tsx examples/music/to-midi.ts song.json song.mid
```

## Datasets

### SimpleMelody
4 melodic phrases using stepwise motion constraints. Good for generating simple melodies.

### FullSong
Complete song structure with:
- Multiple sections (verse, chorus, bridge, intro)
- Melody, chords, and bass tracks
- Tempo and intensity variations
- Outputs multi-track MIDI

### ChordProgressions
4 chord progressions with common pop music weights (I, IV, V, vi).

### DrumPatterns
16-step drum patterns with kick, snare, and hi-hat.

### Ambient
32 unconstrained notes for textural/ambient generation.

## How It Works

### Weighted Note Selection
```vague
pitch: 0.20: 60 |  // C4 - tonic (most common)
       0.18: 67 |  // G4 - dominant
       0.15: 64 |  // E4 - third
       ...
```
Notes are weighted to favor musically important scale degrees.

### Melodic Continuity
```vague
schema MelodicNote {
  pitch: int in 60..72,
  prev_pitch: = previous("pitch"),

  // Constrain to stepwise motion
  assume prev_pitch == null or
         (pitch >= prev_pitch - 3 and pitch <= prev_pitch + 3)
}
```
The `previous()` function enables sequential awareness, and constraints enforce melodic rules.

### Humanization
```vague
velocity: = round(gaussian(80, 12, 45, 120), 0),
timing_offset_ms: = round(gaussian(0, 8, -15, 15), 1)
```
Gaussian distributions add natural variation to dynamics and timing.

### Dynamic Structure
```vague
schema Section {
  type: 0.40: "verse" | 0.35: "chorus" | 0.15: "bridge" | 0.10: "intro",
  intensity: type == "chorus" ? 0.9 : type == "verse" ? 0.6 : 0.5
}
```
Ternary expressions adjust parameters based on section type.

## Extending the Example

### Custom Scales
Modify the pitch weights for different modes:

```vague
// D Dorian mode
pitch: 0.20: 62 |  // D (root)
       0.10: 64 |  // E
       0.15: 65 |  // F
       0.10: 67 |  // G
       0.18: 69 |  // A
       0.12: 71 |  // B
       0.15: 72    // C
```

### Time Signatures
Adjust bar lengths and rhythm patterns for different meters:

```vague
// 3/4 waltz
schema WaltzNote {
  duration: 0.50: 1 | 0.30: 2 | 0.20: 0.5,  // Emphasis on beats
  beat_position: int in 1..3
}
```

### Generative Counterpoint
Use cross-references for harmonically related parts:

```vague
schema CounterpointNote {
  melody_pitch: any of melody_notes,
  // Harmony a third or fifth above/below
  interval: 0.4: 3 | 0.4: 4 | 0.2: 7,
  pitch: = melody_pitch.pitch + interval
}
```

## Output Format

The JSON output looks like:

```json
{
  "songs": [{
    "title": "Generated Song",
    "tempo": 118,
    "key": "C",
    "sections": [{
      "type": "verse",
      "melody": [{
        "notes": [
          {"pitch": 64, "duration": 1, "velocity": 78},
          {"pitch": 65, "duration": 0.5, "velocity": 82}
        ]
      }],
      "chords": [...],
      "bass": [...]
    }]
  }]
}
```

This can be processed by any MIDI library or music software.
