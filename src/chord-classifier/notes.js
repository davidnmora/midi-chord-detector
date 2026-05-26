export const NOTES_PER_OCTAVE = 12;
export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const LOWEST_MIDI_OCTAVE = -1;

const ENHARMONIC_EQUIVALENTS = { 'Db': 'C#', 'D#': 'Eb', 'E#': 'F', 'Fb': 'E', 'Gb': 'F#', 'G#': 'Ab', 'A#': 'Bb', 'B#': 'C', 'Cb': 'B' };

export const pitchClass = (midi) =>
  ((midi % NOTES_PER_OCTAVE) + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

export const midiToNote = (midi) => ({
  noteName: NOTE_NAMES[pitchClass(midi)],
  octave: Math.floor(midi / NOTES_PER_OCTAVE) + LOWEST_MIDI_OCTAVE,
});

const canonicalNoteName = (noteName) => ENHARMONIC_EQUIVALENTS[noteName] ?? noteName;

export const noteNameToPitchClass = (noteName) => {
  const pc = NOTE_NAMES.indexOf(canonicalNoteName(noteName));
  if (pc === -1) throw new Error(`Invalid note name: "${noteName}"`);
  return pc;
};

export const noteToMidi = ({ noteName, octave }) =>
  NOTE_NAMES.indexOf(canonicalNoteName(noteName)) + (octave - LOWEST_MIDI_OCTAVE) * NOTES_PER_OCTAVE;

const parseNoteString = (str) => {
  const match = str.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid note string: "${str}"`);
  return { noteName: match[1], octave: parseInt(match[2], 10) };
};

export const coerceToMidi = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return noteToMidi(parseNoteString(value));
  if (typeof value === 'object' && value !== null) return noteToMidi(value);
  throw new Error(`Cannot coerce value to MIDI number: ${JSON.stringify(value)}`);
};
