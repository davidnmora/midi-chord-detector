# midi-chord-detector

Vanilla ESM JS module that connects to a USB MIDI keyboard via the **Web MIDI API**, buffers held notes, and emits `onChordStart` / `onChordEnd` callbacks with structured chord info.

## Usage

```js
import { createChordDetector } from './src/index.js';

const detector = createChordDetector({
  splitBassAndTrebleOn: 'C4', // or { noteName: 'C', octave: 4 }, or MIDI number 60
  settleMs: 60,               // ms of silence before a chord is stamped
  onChordStart: (chord) => console.log('start', chord),
  onChordEnd:   (chord) => console.log('end',   chord),
});

await detector.connect();       // picks first MIDI input; prompts browser permission
await detector.connect({ inputName: 'Arturia KeyStep' }); // or target by name

detector.listInputs();          // → array of device info objects
detector.getActiveInput();      // → active device info or null
detector.disconnect();
```

### Chord event shape

```js
{
  bassNote:    { noteName: 'C',  octave: 3 },
  trebleNotes: [
    { noteName: 'D#', octave: 4 },
    { noteName: 'G',  octave: 4 },
    { noteName: 'C',  octave: 5 },
  ],
  chordName: 'C minor',   // 'C major' | 'C minor' | 'unknown'
}
```

A chord is valid when exactly **1 bass note** (≤ split) and **3 treble notes** (> split) are held simultaneously.

### Demo

Open `demo/index.html` directly in Chrome or Edge (Web MIDI requires a secure context or localhost).

## Module layout

```
src/
  index.js                  public re-exports
  chord-detector.js         orchestrator: held-notes, settle timer, event emission
  midi-input.js             Web MIDI API wrapper
  chord-resolver/
    index.js                createChordResolver + resolve()
    templates.js            chord templates (major, minor)
    notes.js                pitch-class arithmetic + note ↔ MIDI helpers
demo/
  index.html
  demo.js
```

## Extending chord types

Add entries to `src/chord-resolver/templates.js`:

```js
export const CHORD_TEMPLATES = [
  { suffix: 'major',     intervals: [0, 4, 7] },
  { suffix: 'minor',     intervals: [0, 3, 7] },
  { suffix: 'diminished', intervals: [0, 3, 6] },    // add more here
  { suffix: 'augmented',  intervals: [0, 4, 8] },
];
```

Or pass custom templates directly:

```js
createChordDetector({
  chordResolverOptions: { templates: myTemplates },
});
```
