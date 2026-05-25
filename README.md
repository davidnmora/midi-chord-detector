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

The Web MIDI API requires a **secure context** — `file://` URLs and remote `http://` origins won't work. Serve the project locally and open it via `localhost`:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000/demo/index.html** in Chrome or Edge and click **Connect MIDI**.

## Module layout

```
src/
  index.js                  public re-exports
  chord-detector.js         MIDI orchestration: held-notes, settle timer, event emission
  midi-input.js             Web MIDI API wrapper
  chord-classifier/         standalone: bass + treble notes → chord designation
    index.js                createChordClassifier + classify()
    templates.js            chord templates (major, minor)
    notes.js                pitch-class arithmetic + note ↔ MIDI helpers
demo/
  index.html
  demo.js
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
  { suffix: 'major',     intervals: [0, 4, 7] },
  { suffix: 'minor',     intervals: [0, 3, 7] },
  { suffix: 'diminished', intervals: [0, 3, 6] },    // add more here
  { suffix: 'augmented',  intervals: [0, 4, 8] },
];
```

Or pass custom templates directly:

```js
createChordDetector({
  chordClassifierOptions: { templates: myTemplates },
});
```
