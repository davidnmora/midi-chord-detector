import { NOTE_NAMES, noteNameToPitchClass } from '../chord-classifier/notes.js';

const NOTE_REGEX = /^([A-G][#b]?)/;

const SUFFIX_TOKEN_TO_SUFFIX = {
  '': 'major',
  'maj': 'major',
  'M': 'major',
  'm': 'minor',
  'min': 'minor',
  'dim': 'diminished',
  'aug': 'augmented',
  '+': 'augmented',
  'sus2': 'sus2',
  'sus4': 'sus4',
  'maj7': 'maj7',
  'M7': 'maj7',
  '7': '7',
  'm7': 'minor7',
  'min7': 'minor7',
  'mMaj7': 'minor maj7',
  'mmaj7': 'minor maj7',
  'mM7': 'minor maj7',
  'minMaj7': 'minor maj7',
  'add9': 'add9',
  'madd9': 'minor add9',
  '7sus4': '7sus4',
  'm7b5': 'm7b5',
  'dim7': 'dim7',
  '9': '9',
  'maj9': 'maj9',
  'M9': 'maj9',
  'm9': 'minor9',
  'min9': 'minor9',
  '6': '6',
  '6/9': '6/9',
};

const SUFFIX_TO_SHORTHAND = {
  'major': '',
  'minor': 'm',
  'diminished': 'dim',
  'augmented': 'aug',
  'sus2': 'sus2',
  'sus4': 'sus4',
  'maj7': 'maj7',
  '7': '7',
  'minor maj7': 'mMaj7',
  'add9': 'add9',
  'minor add9': 'madd9',
  '7sus4': '7sus4',
  'm7b5': 'm7b5',
  'dim7': 'dim7',
  'minor7': 'm7',
  '6': '6',
  '9': '9',
  'maj9': 'maj9',
  'minor9': 'm9',
  '6/9': '6/9',
};

const splitNoteAndRest = (chordString) => {
  const noteMatch = chordString.match(NOTE_REGEX);
  if (!noteMatch) throw new Error(`Invalid chord shorthand: "${chordString}"`);
  return { noteName: noteMatch[1], rest: chordString.slice(noteMatch[0].length) };
};

const lookupSuffix = (token) => SUFFIX_TOKEN_TO_SUFFIX[token];

const stripSlashBassFromRest = (rest) => {
  const slashIdx = rest.indexOf('/');
  return slashIdx === -1 ? rest : rest.slice(0, slashIdx);
};

const resolveSuffixFromRest = (rest, originalString) => {
  const direct = lookupSuffix(rest);
  if (direct !== undefined) return direct;
  const beforeSlash = lookupSuffix(stripSlashBassFromRest(rest));
  if (beforeSlash !== undefined) return beforeSlash;
  throw new Error(`Unknown chord modifier: "${rest}" in "${originalString}"`);
};

export const parseChordShorthand = (chordString) => {
  const trimmed = chordString.trim();
  const { noteName, rest } = splitNoteAndRest(trimmed);
  const suffix = resolveSuffixFromRest(rest, trimmed);
  return { rootPc: noteNameToPitchClass(noteName), suffix, display: trimmed };
};

export const parseProgressionString = (progressionString) =>
  progressionString.trim().split(/\s+/).map(parseChordShorthand);

export const formatChordShorthand = ({ rootPc, suffix }) => {
  const noteName = NOTE_NAMES[rootPc];
  const tail = SUFFIX_TO_SHORTHAND[suffix] ?? suffix;
  return `${noteName}${tail}`;
};
