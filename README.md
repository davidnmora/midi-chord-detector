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
  chordName: 'C minor',   // e.g. 'C major', 'G sus4', 'C dim7 / Bb', 'unknown'
}
```

A chord is valid when exactly **1 bass note** (≤ split) and **3 treble notes** (> split) are held simultaneously.

### Bass as a root hint

Some treble shapes are ambiguous — `C, D, G` is both `C sus2` and `G sus4`, and a fully-diminished 7th has four equally valid roots. The classifier collects every valid interpretation of the treble notes and uses the **bass pitch class** to pick the root: if the bass matches one of the candidate roots, that interpretation wins; otherwise the first match is used and the bass is shown as a slash (e.g. `C sus2 / D`). Unambiguous chords (major/minor/etc.) behave exactly as before.

### Demo

The Web MIDI API requires a **secure context** — `file://` URLs and remote `http://` origins won't work. Serve the project locally and open it via `localhost`:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000/demo/index.html** in Chrome or Edge and click **Connect MIDI**.

## Module layout

```
src/
  index.js                  public re-exports
  chord-detector.js         wires: midi-input → chord-gater → chord-classifier
  midi-input/               Web MIDI API (note-on/off, devices)
    index.js                createMidiInput
  chord-gater/              held notes + settle + bass/treble split → stable candidates
    index.js                createChordGater
  chord-classifier/         standalone: bass + treble notes → chord designation
    index.js                createChordClassifier + classify()
    templates.js            chord templates (major, minor)
    notes.js                pitch-class arithmetic + note ↔ MIDI helpers
demo/
  index.html
  demo.js
```

### Stable chord gate (without MIDI)

`chord-gater` emits `{ bassMidi, trebleMidis }` once the finger set settles. Feed it synthetic note events:

```js
import { createChordGater } from './src/chord-gater/index.js';

const gate = createChordGater({
  splitBassAndTrebleOn: 'C4',
  settleMs: 60,
  onStableChordCandidate: ({ bassMidi, trebleMidis }) =>
    console.log('stable', bassMidi, trebleMidis),
  onStableChordRelease: ({ bassMidi, trebleMidis }) =>
    console.log('released', bassMidi, trebleMidis),
});

gate.handleNoteOn(48);
// …gate.handleNoteOn / gate.handleNoteOff as needed
gate.dispose(); // clears timer and notifies release if a chord was active
```

### Standalone chord classification

Import `chord-classifier` on its own when you already have a bass note and treble notes — no MIDI required:

```js
import { createChordClassifier } from './src/chord-classifier/index.js';

const classifier = createChordClassifier();

classifier.classify({
  bassMidi: 48,              // C3
  trebleMidis: [63, 67, 72], // D#4, G4, C5
});
// → 'C minor'
```

## Extending chord types

Add entries to `src/chord-classifier/templates.js`:

```js
export const CHORD_TEMPLATES = [
  { suffix: 'major',      intervals: [0, 4, 7] },
  { suffix: 'minor',      intervals: [0, 3, 7] },
  { suffix: 'diminished', intervals: [0, 3, 6] },
  { suffix: 'augmented',  intervals: [0, 4, 8] },
  { suffix: 'sus2',       intervals: [0, 2, 7] },
  { suffix: 'sus4',       intervals: [0, 5, 7] },
  { suffix: 'maj7',       intervals: [0, 4, 7, 11] },
  { suffix: '7',          intervals: [0, 4, 7, 10] },
  { suffix: 'm7b5',       intervals: [0, 3, 6, 10] },  // half-diminished 7
  { suffix: 'dim7',       intervals: [0, 3, 6, 9]  },  // fully-diminished 7
];
```

Or pass custom templates directly:

```js
createChordDetector({
  chordClassifierOptions: { templates: myTemplates },
});
```
