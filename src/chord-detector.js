import { createMidiInput } from './midi-input.js';
import { createChordResolver } from './chord-resolver/index.js';
import { midiToNote, coerceToMidi } from './chord-resolver/notes.js';

const DEFAULT_SETTLE_MS = 60;
const BASS_COUNT = 1;
const TREBLE_COUNT = 3;

const sortedMidiArray = (set) => [...set].sort((a, b) => a - b);

const arraysEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const buildChordEvent = (bassMidi, trebleMidis, resolver) => ({
  bassNote: midiToNote(bassMidi),
  trebleNotes: trebleMidis.map(midiToNote),
  chordName: resolver.resolve({ bassMidi, trebleMidis }),
  _bassMidi: bassMidi,
  _trebleMidis: trebleMidis,
});

export const createChordDetector = ({
  splitBassAndTrebleOn = 'C4',
  settleMs = DEFAULT_SETTLE_MS,
  onChordStart,
  onChordEnd,
  onStateChange,
  chordResolverOptions,
} = {}) => {
  const splitMidi = coerceToMidi(splitBassAndTrebleOn);
  const resolver = createChordResolver(chordResolverOptions);

  let heldNotes = new Set();
  let activeChord = null;
  let settleTimer = null;

  const onSettle = () => {
    settleTimer = null;
    const sorted = sortedMidiArray(heldNotes);
    const bass = sorted.filter((m) => m <= splitMidi);
    const treble = sorted.filter((m) => m > splitMidi);
    const isValid = bass.length === BASS_COUNT && treble.length === TREBLE_COUNT;

    const candidateMatchesActive =
      activeChord &&
      isValid &&
      activeChord._bassMidi === bass[0] &&
      arraysEqual(activeChord._trebleMidis, treble);

    if (candidateMatchesActive) return;

    if (activeChord) {
      onChordEnd?.(activeChord);
      activeChord = null;
    }

    if (isValid) {
      activeChord = buildChordEvent(bass[0], treble, resolver);
      onChordStart?.(activeChord);
    }
  };

  const scheduleSettle = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, settleMs);
  };

  const midiInputCallbacks = {
    onNoteOn: ({ midi }) => {
      heldNotes = new Set([...heldNotes, midi]);
      scheduleSettle();
    },
    onNoteOff: ({ midi }) => {
      heldNotes = new Set([...heldNotes].filter((n) => n !== midi));
      scheduleSettle();
    },
    onStateChange,
  };

  const midiInput = createMidiInput(midiInputCallbacks);

  const connect = (options) => midiInput.connect(options);
  const disconnect = () => {
    midiInput.disconnect();
    clearTimeout(settleTimer);
    settleTimer = null;
    if (activeChord) {
      onChordEnd?.(activeChord);
      activeChord = null;
    }
    heldNotes = new Set();
  };

  return {
    connect,
    disconnect,
    listInputs: midiInput.listInputs,
    getActiveInput: midiInput.getActiveInput,
  };
};
