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

  const classifyTreble = (trebleMidis) => {
    const treblePcs = new Set(trebleMidis.map(pitchClass));
    for (const rootPc of treblePcs) {
      const intervals = intervalsFromRoot(rootPc, treblePcs);
      const match = templateSets.find(({ intervalSet }) => setsEqual(intervals, intervalSet));
      if (match) return { rootPc, suffix: match.suffix };
    }
    return null;
  };

  const classify = ({ bassMidi, trebleMidis }) => {
    const trebleResult = classifyTreble(trebleMidis);
    if (!trebleResult) return 'unknown';

    const chordName = `${NOTE_NAMES_SHARP[trebleResult.rootPc]} ${trebleResult.suffix}`;
    const bassPc = pitchClass(bassMidi);

    if (bassPc === trebleResult.rootPc) return chordName;
    return `${chordName} / ${NOTE_NAMES_SHARP[bassPc]}`;
  };

  return { classify };
};
