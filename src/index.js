export { createChordDetector } from './chord-detector.js';
export { createMidiInput } from './midi-input/index.js';
export { createChordGater } from './chord-gater/index.js';
export {
  createChordClassifier,
  formatChordName,
  UNKNOWN_CHORD_NAME,
} from './chord-classifier/index.js';
export { CHORD_TEMPLATES } from './chord-classifier/templates.js';
export {
  midiToNote,
  noteToMidi,
  coerceToMidi,
  pitchClass,
  noteNameToPitchClass,
} from './chord-classifier/notes.js';
export {
  createProgressionSearch,
  parseChordShorthand,
  parseProgressionString,
  formatChordShorthand,
  toAbstractProgression,
  findSubProgressionMatches,
  progressionContainsSubProgression,
} from './match-chord-progressions/index.js';
