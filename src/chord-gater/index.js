import { coerceToMidi } from '../chord-classifier/notes.js';

const DEFAULT_SETTLE_MS = 60;
const BASS_COUNT = 1;
const TREBLE_COUNT = 3;

const sortedMidiArray = (set) => [...set].sort((a, b) => a - b);

const arraysEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const createChordGater = ({
  splitBassAndTrebleOn = 'C4',
  settleMs = DEFAULT_SETTLE_MS,
  onStableChordCandidate,
  onStableChordRelease,
} = {}) => {
  const splitMidi = coerceToMidi(splitBassAndTrebleOn);

  let heldNotes = new Set();
  let activeStableMidi = null;
  let settleTimer = null;

  const settleAndNotify = () => {
    settleTimer = null;
    const sorted = sortedMidiArray(heldNotes);
    const bass = sorted.filter((m) => m <= splitMidi);
    const treble = sorted.filter((m) => m > splitMidi);
    const isValid = bass.length === BASS_COUNT && treble.length === TREBLE_COUNT;

    const candidateMatchesActive =
      activeStableMidi &&
      isValid &&
      activeStableMidi.bassMidi === bass[0] &&
      arraysEqual(activeStableMidi.trebleMidis, treble);

    if (candidateMatchesActive) return;

    if (activeStableMidi) {
      const released = activeStableMidi;
      activeStableMidi = null;
      onStableChordRelease?.(released);
    }

    if (!isValid) return;

    const next = {
      bassMidi: bass[0],
      trebleMidis: treble,
    };
    activeStableMidi = next;
    onStableChordCandidate?.(next);
  };

  const scheduleSettle = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settleAndNotify, settleMs);
  };

  const handleNoteOn = (midi) => {
    heldNotes = new Set([...heldNotes, midi]);
    scheduleSettle();
  };

  const handleNoteOff = (midi) => {
    heldNotes = new Set([...heldNotes].filter((n) => n !== midi));
    scheduleSettle();
  };

  const dispose = () => {
    clearTimeout(settleTimer);
    settleTimer = null;
    if (activeStableMidi) {
      const released = activeStableMidi;
      activeStableMidi = null;
      onStableChordRelease?.(released);
    }
    heldNotes = new Set();
  };

  return { handleNoteOn, handleNoteOff, dispose };
};
