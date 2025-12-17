/**
 * Converts Vague-generated music JSON to MIDI files
 *
 * Usage:
 *   npx tsx examples/music/to-midi.ts [input.json] [output.mid]
 *
 * If no input specified, reads from stdin
 * If no output specified, writes to output.mid
 *
 * Dependencies:
 *   npm install midi-writer-js
 */

import * as fs from 'fs';
import MidiWriter from 'midi-writer-js';

// Type definitions for our Vague-generated music data
interface MelodicNote {
  pitch: number;
  duration: number;
  velocity: number;
  timing_offset_ms?: number;
}

interface Chord {
  root: number;
  quality: 'major' | 'minor' | 'seventh';
  duration: number;
  velocity: number;
}

interface BassNote {
  pitch: number;
  duration: number;
  velocity: number;
  timing_offset_ms?: number;
}

interface MelodicPhrase {
  notes: MelodicNote[];
}

interface ChordProgression {
  chords: Chord[];
}

interface BassLine {
  notes: BassNote[];
}

interface Section {
  type: string;
  bars: number;
  melody: MelodicPhrase[];
  chords: ChordProgression[];
  bass: BassLine[];
  intensity: number;
}

interface Song {
  title: string;
  tempo: number;
  key: string;
  time_signature: string;
  sections: Section[];
}

interface DrumStep {
  active: boolean;
  sound: number;
  velocity: number;
}

interface DrumPattern {
  steps: DrumStep[];
}

// Convert duration in beats to MIDI duration string
function beatsToDuration(beats: number): string {
  // midi-writer-js uses duration strings like '4' for quarter note
  // or 'd4' for dotted quarter, or arrays for tied notes
  if (beats === 4) return '1'; // whole note
  if (beats === 2) return '2'; // half note
  if (beats === 1.5) return 'd4'; // dotted quarter
  if (beats === 1) return '4'; // quarter note
  if (beats === 0.75) return 'd8'; // dotted eighth
  if (beats === 0.5) return '8'; // eighth note
  if (beats === 0.25) return '16'; // sixteenth note
  if (beats === 0.125) return '32'; // thirty-second note

  // Default to quarter note for unusual durations
  return '4';
}

// Get chord notes from root and quality
function getChordNotes(root: number, quality: string): number[] {
  switch (quality) {
    case 'major':
      return [root, root + 4, root + 7]; // Root, major 3rd, perfect 5th
    case 'minor':
      return [root, root + 3, root + 7]; // Root, minor 3rd, perfect 5th
    case 'seventh':
      return [root, root + 4, root + 7, root + 10]; // Dominant 7th
    default:
      return [root, root + 4, root + 7];
  }
}

// Convert MIDI note number to note name
function midiToNoteName(midi: number): string {
  const noteNames = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}

// Process SimpleMelody dataset
function processSimpleMelody(
  data: { phrases: MelodicPhrase[] },
  tempo: number = 120
): MidiWriter.Writer {
  const track = new MidiWriter.Track();
  track.setTempo(tempo);
  track.addTrackName('Melody');

  for (const phrase of data.phrases) {
    for (const note of phrase.notes) {
      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [midiToNoteName(note.pitch)],
          duration: beatsToDuration(note.duration),
          velocity: Math.round(note.velocity),
        })
      );
    }
  }

  return new MidiWriter.Writer([track]);
}

// Process FullSong dataset
function processFullSong(data: { songs: Song[] }): MidiWriter.Writer {
  const song = data.songs[0];
  const tracks: MidiWriter.Track[] = [];

  // Melody track
  const melodyTrack = new MidiWriter.Track();
  melodyTrack.setTempo(song.tempo);
  melodyTrack.addTrackName('Melody');

  // Chords track
  const chordsTrack = new MidiWriter.Track();
  chordsTrack.setTempo(song.tempo);
  chordsTrack.addTrackName('Chords');

  // Bass track
  const bassTrack = new MidiWriter.Track();
  bassTrack.setTempo(song.tempo);
  bassTrack.addTrackName('Bass');

  for (const section of song.sections) {
    // Process melody
    for (const phrase of section.melody) {
      for (const note of phrase.notes) {
        // Apply intensity to velocity
        const velocity = Math.round(note.velocity * section.intensity);
        melodyTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [midiToNoteName(note.pitch)],
            duration: beatsToDuration(note.duration),
            velocity: Math.min(127, Math.max(1, velocity)),
          })
        );
      }
    }

    // Process chords
    for (const progression of section.chords) {
      for (const chord of progression.chords) {
        const chordNotes = getChordNotes(chord.root, chord.quality);
        const velocity = Math.round(chord.velocity * section.intensity);
        chordsTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: chordNotes.map(midiToNoteName),
            duration: beatsToDuration(chord.duration),
            velocity: Math.min(127, Math.max(1, velocity)),
          })
        );
      }
    }

    // Process bass
    for (const bassLine of section.bass) {
      for (const note of bassLine.notes) {
        const velocity = Math.round(note.velocity * section.intensity);
        bassTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [midiToNoteName(note.pitch)],
            duration: beatsToDuration(note.duration),
            velocity: Math.min(127, Math.max(1, velocity)),
          })
        );
      }
    }
  }

  tracks.push(melodyTrack, chordsTrack, bassTrack);
  return new MidiWriter.Writer(tracks);
}

// Process DrumPatterns dataset
function processDrumPatterns(
  data: { patterns: DrumPattern[] },
  tempo: number = 120
): MidiWriter.Writer {
  const track = new MidiWriter.Track();
  track.setTempo(tempo);
  track.addTrackName('Drums');

  // Set to channel 10 for drums (MIDI channel 9, 0-indexed)
  // Note: midi-writer-js uses 1-indexed channels

  for (const pattern of data.patterns) {
    for (const step of pattern.steps) {
      if (step.active && step.velocity > 0) {
        track.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [midiToNoteName(step.sound)],
            duration: '16', // 16th note steps
            velocity: step.velocity,
            channel: 10,
          })
        );
      } else {
        // Rest
        track.addEvent(
          new MidiWriter.NoteEvent({
            pitch: ['C4'],
            duration: '16',
            velocity: 0,
          })
        );
      }
    }
  }

  return new MidiWriter.Writer([track]);
}

// Process Ambient dataset (just notes)
function processAmbient(
  data: { notes: MelodicNote[] },
  tempo: number = 80
): MidiWriter.Writer {
  const track = new MidiWriter.Track();
  track.setTempo(tempo);
  track.addTrackName('Ambient');

  for (const note of data.notes) {
    track.addEvent(
      new MidiWriter.NoteEvent({
        pitch: [midiToNoteName(note.pitch)],
        duration: beatsToDuration(note.duration),
        velocity: Math.round(note.velocity),
      })
    );
  }

  return new MidiWriter.Writer([track]);
}

// Process ChordProgressions dataset
function processChordProgressions(
  data: { progressions: ChordProgression[] },
  tempo: number = 100
): MidiWriter.Writer {
  const track = new MidiWriter.Track();
  track.setTempo(tempo);
  track.addTrackName('Chords');

  for (const progression of data.progressions) {
    for (const chord of progression.chords) {
      const chordNotes = getChordNotes(chord.root, chord.quality);
      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: chordNotes.map(midiToNoteName),
          duration: beatsToDuration(chord.duration),
          velocity: chord.velocity,
        })
      );
    }
  }

  return new MidiWriter.Writer([track]);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0];
  const outputFile = args[1] || 'output.mid';

  let jsonData: string;

  if (inputFile) {
    jsonData = fs.readFileSync(inputFile, 'utf-8');
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    jsonData = Buffer.concat(chunks).toString('utf-8');
  }

  const data = JSON.parse(jsonData);

  let writer: MidiWriter.Writer;

  // Detect dataset type and process accordingly
  if (data.songs) {
    console.log('Detected: FullSong dataset');
    writer = processFullSong(data);
  } else if (data.phrases) {
    console.log('Detected: SimpleMelody dataset');
    writer = processSimpleMelody(data);
  } else if (data.patterns) {
    console.log('Detected: DrumPatterns dataset');
    writer = processDrumPatterns(data);
  } else if (data.progressions) {
    console.log('Detected: ChordProgressions dataset');
    writer = processChordProgressions(data);
  } else if (data.notes) {
    console.log('Detected: Ambient dataset');
    writer = processAmbient(data);
  } else {
    console.error(
      'Unknown dataset format. Expected: songs, phrases, patterns, progressions, or notes'
    );
    process.exit(1);
  }

  // Write MIDI file
  fs.writeFileSync(outputFile, Buffer.from(writer.buildFile()));
  console.log(`MIDI file written to: ${outputFile}`);
}

main().catch(console.error);
