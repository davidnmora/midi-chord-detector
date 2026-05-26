# midi-chord-detector

Vanilla ESM JS module that connects to a USB MIDI keyboard via the **Web MIDI API**, buffers held notes, and emits `onChordStart` / `onChordEnd` callbacks with structured chord info.

## Usage

```js
import { createChordDetector } from './src/index.js';

const detector = createChordDetector({
  splitBassAndTrebleOn: 'C4', // or { noteName: 'C', octave: 4 }, or MIDI number 60
  settleMs: 60,               // ms of silence before a chord is stamped
  getBassAsRoot: () => false, // optional live getter — see "Bass as root" below
  onChordStart: (chord) => console.log('start', chord),
  onChordEnd:   (chord) => console.log('end',   chord),
});

await detector.connect();       // picks first MIDI input; prompts browser permission
await detector.connect({ inputName: 'Arturia KeyStep' }); // or target by name

detector.listInputs();          // → array of device info objects
detector.getActiveInput();      // → active device info or null
detector.reclassify();          // re-runs classify on the current held chord (e.g. after toggling getBassAsRoot)
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
  chord: { rootPitchClass: 0, suffix: 'minor' }, // structured form; bassPitchClass when slash (e.g. C major / G), or null when unknown
}
```

**Pitch class** is the note without its octave — one of 12 chromatic steps (C=0 … B=11). Middle C (MIDI 60), C5, and C3 all share pitch class 0. Chords are matched on pitch classes because they're defined by intervals, not absolute pitch.

A chord is valid when exactly **1 bass note** (≤ split) and **3 treble notes** (> split) are held simultaneously.

### Bass as root

The bass note participates in chord identification in two modes, controlled by the `getBassAsRoot` getter you pass to `createChordDetector` (or the `bassAsRoot` boolean passed directly to `classify`):

**Default (bassAsRoot = false) — disambiguation only**

The classifier finds every valid chord interpretation of the treble notes alone, then uses the bass pitch class to pick between them. If the bass matches one of the candidate roots it wins; otherwise the highest-priority match is used and the bass appears as a slash note (e.g. `Em / C`). Unambiguous treble shapes are unaffected.

**bassAsRoot = true — bass as a chord tone**

The bass pitch class is added to the treble set and the whole group is matched against templates with the bass as root. `bass=C, treble=E G B` → pitch classes `{C E G B}` → intervals from C `{0 4 7 11}` → **C maj7**. Falls back to the default disambiguation path if no template matches the combined set.

`getBassAsRoot` is called lazily on every chord event, so a live UI toggle takes effect immediately without reconnecting. Call `detector.reclassify()` to re-evaluate the current held chord after the getter's value changes.

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
    index.js                createChordClassifier + classify() + formatChordName
    templates.js            chord templates (major, minor)
    notes.js                pitch-class arithmetic + note ↔ MIDI helpers
  match-chord-progressions/ key-agnostic chord-progression search
    index.js                createProgressionSearch
    match.js                abstract progression + sub-progression matching
demo/
  index.html
  demo.js
  songs.js                  example song catalog used by the search demo
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
import { createChordClassifier, formatChordName } from './src/chord-classifier/index.js';

const classifier = createChordClassifier();

classifier.classify({
  bassMidi: 48,              // C3
  trebleMidis: [63, 67, 72], // D#4, G4, C5
});
// → { rootPitchClass: 0, suffix: 'minor', bassPitchClass: 0 }

classifier.classify({
  bassMidi: 48,              // C3
  trebleMidis: [64, 67, 71], // E4, G4, B4
  bassAsRoot: true,
});
// → { rootPitchClass: 0, suffix: 'maj7' }  (bass included as a chord tone, rooted on C)

formatChordName({ rootPitchClass: 0, suffix: 'minor' });        // → 'C minor'
formatChordName({ rootPitchClass: 0, suffix: 'major', bassPitchClass: 4 }); // → 'C major / E'
formatChordName(null);                                   // → 'unknown'
```

`classify()` returns `null` when no template matches. `formatChordName` accepts that and returns `'unknown'`.

### Searching songs by chord progression

`match-chord-progressions` matches user-played chords against a song catalog **abstractly**: matching is on chord *types* and the *intervals between roots*, not absolute pitch. So a played `D → A → Bm` (in any key) matches a song's `C → G → Am` (I-V-vi anywhere), and a `ii-V-I` shape matches across all keys.

```js
import { createProgressionSearch } from './src/match-chord-progressions/index.js';

const search = createProgressionSearch({
  songs: [
    {
      title: 'Hey, Soul Sister',
      artist: 'Train',
      progression: [
        { noteName: 'C', suffix: 'major' },
        { noteName: 'G', suffix: 'major' },
        { noteName: 'A', suffix: 'minor' },
        { noteName: 'F', suffix: 'major' },
      ],
    },
    {
      title: 'Sunday Morning',
      artist: 'Maroon 5',
      progression: [
        { noteName: 'D', suffix: 'minor7' },
        { noteName: 'G', suffix: '7' },
        { noteName: 'C', suffix: 'maj7' },
      ],
    },
  ],
});

search.append({ rootPitchClass: 2, suffix: 'major' });   // D major
search.append({ rootPitchClass: 9, suffix: 'major' });   // A major
search.append({ rootPitchClass: 11, suffix: 'minor' });  // B minor

search.getResults();
// → [{ song: { title: 'Hey, Soul Sister', ..., parsedProgression: [...] },
//      matches: [{ start: 0, length: 3 }] }]

search.clear();
```

A match is any contiguous window in the song's progression (with wrap-around for looped songs) whose chord suffixes, root-to-root semitone deltas, and bass-to-root intervals (for slash chords) match the search. Songs may specify an optional `bassNoteName` per chord (e.g. `{ noteName: 'C', suffix: 'major', bassNoteName: 'G' }`).

## Extending chord types

Add entries to `src/chord-classifier/templates.js`. Each template is a **pitch-class set** relative to a candidate root, not a voicing or note order.

### Example templates

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
  { suffix: 'm7b5',       intervals: [0, 3, 6, 10] },
  { suffix: 'dim7',       intervals: [0, 3, 6, 9] },
  // ... etc
];
```

Or pass custom templates directly:

```js
createChordDetector({
  chordClassifierOptions: { templates: myTemplates },
});
```


### What `intervals` means

Each value is a **semitone distance from the root within one octave** (0–11). The root is always `0`. For example, a major triad is `[0, 4, 7]`: root, major third (+4 semitones), perfect fifth (+7). A dominant 7th adds the flat seventh at +10: `[0, 4, 7, 10]`.

The array length is how many **distinct pitch classes** must be held at once (after collapsing duplicate keys and ignoring octave). A three-note template only matches when exactly three different pitch classes are sounding in the treble; a fifth does not match a triad, and holding an extra tone (e.g. adding the 9 on a triad) prevents a match until you add a template that includes that interval.

### How matching works (order-independent)

Classification in `src/chord-classifier/index.js` does not care about the order notes were played or which octave they sit in:

1. Incoming MIDI is reduced to **pitch classes** (0 = C, 1 = C#, …, 11 = B).
2. Duplicate pitch classes are dropped (one `Set` of held classes).
3. For **each** held pitch class as a trial root, the classifier builds the set of intervals from that root to every held class: `(note - root + 12) % 12`.
4. That set is compared to the template’s `intervals` (also stored as a set). They must be **exactly equal**—same size, same members.

So voicing order does not matter. `E`–`G`–`C` and `C`–`E`–`G` in any octave are the same pitch classes `{0, 4, 7}`; with trial root `C` (0), intervals are `{0, 4, 7}`, which matches `major`.

Order in the `intervals` array also does not matter; `[7, 0, 4]` is equivalent to `[0, 4, 7]`. Convention is to list `0` first and ascending intervals for readability.

**Root ambiguity:** If multiple trial roots yield the same interval set against different templates, the **bass note** (lowest MIDI in the split) breaks ties when it equals one of those roots; otherwise the template with the highest optional `priority` wins (see `minor7` vs `6` in `templates.js`).

