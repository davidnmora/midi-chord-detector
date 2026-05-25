export const NOTES_PER_OCTAVE = 12;
export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const LOWEST_MIDI_OCTAVE = -1; // MIDI note 0 == C-1

export const pitchClass = (midi) =>
  ((midi % NOTES_PER_OCTAVE) + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

export const midiToNote = (midi) => ({
  noteName: NOTE_NAMES_SHARP[pitchClass(midi)],
  octave: Math.floor(midi / NOTES_PER_OCTAVE) + LOWEST_MIDI_OCTAVE,
});

export const noteToMidi = ({ noteName, octave }) =>
  NOTE_NAMES_SHARP.indexOf(noteName) + (octave - LOWEST_MIDI_OCTAVE) * NOTES_PER_OCTAVE;

const parseNoteString = (str) => {
  const match = str.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid note string: "${str}"`);
  return { noteName: match[1], octave: parseInt(match[2], 10) };
};

export const coerceToMidi = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return noteToMidi(parseNoteString(value));
  if (typeof value === 'object' && value !== null) return noteToMidi(value);
  throw new Error(`Cannot coerce value to MIDI number: ${JSON.stringify(value)}`);
};
