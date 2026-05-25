import { NOTES_PER_OCTAVE, NOTE_NAMES_SHARP, pitchClass } from './notes.js';
import { CHORD_TEMPLATES } from './templates.js';

const setsEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
};

const intervalsFromRoot = (rootPc, pitchClasses) =>
  new Set([...pitchClasses].map((pc) => (pc - rootPc + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE));

export const createChordClassifier = ({ templates = CHORD_TEMPLATES } = {}) => {
  const templateSets = templates.map(({ suffix, intervals }) => ({
    suffix,
    intervalSet: new Set(intervals),
  }));

  const classify = ({ bassMidi, trebleMidis }) => {
    const rootPc = pitchClass(bassMidi);
    const allPcs = new Set([bassMidi, ...trebleMidis].map(pitchClass));
    const played = intervalsFromRoot(rootPc, allPcs);

    const match = templateSets.find(({ intervalSet }) => setsEqual(played, intervalSet));
    return match ? `${NOTE_NAMES_SHARP[rootPc]} ${match.suffix}` : 'unknown';
  };

  return { classify };
};
