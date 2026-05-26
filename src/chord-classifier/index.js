import { NOTES_PER_OCTAVE, NOTE_NAMES, pitchClass } from './notes.js';
import { CHORD_TEMPLATES } from './templates.js';

export const UNKNOWN_CHORD_NAME = 'unknown';

const setsEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
};

const intervalsFromRoot = (rootPc, pitchClasses) =>
  new Set([...pitchClasses].map((pc) => (pc - rootPc + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE));

export const hasDistinctBass = ({ rootPc, bassPc }) =>
  bassPc !== undefined && bassPc !== rootPc;

export const bassIntervalFromRoot = (chord) =>
  hasDistinctBass(chord)
    ? (chord.bassPc - chord.rootPc + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE
    : null;

export const structuredChordFromClassification = (classification) => {
  if (!classification) return null;
  const { rootPc, suffix, bassPc } = classification;
  return hasDistinctBass({ rootPc, bassPc })
    ? { rootPc, suffix, bassPc }
    : { rootPc, suffix };
};

export const chordsAreEqual = (a, b) =>
  a.rootPc === b.rootPc &&
  a.suffix === b.suffix &&
  (hasDistinctBass(a) ? a.bassPc : a.rootPc) === (hasDistinctBass(b) ? b.bassPc : b.rootPc);

export const formatChordName = (chord) => {
  if (!chord) return UNKNOWN_CHORD_NAME;
  const { rootPc, suffix, bassPc } = chord;
  const base = `${NOTE_NAMES[rootPc]} ${suffix}`;
  return hasDistinctBass(chord) ? `${base} / ${NOTE_NAMES[bassPc]}` : base;
};

export const createChordClassifier = ({ templates = CHORD_TEMPLATES } = {}) => {
  const templateSets = templates.map(({ suffix, intervals, priority = 0 }) => ({
    suffix,
    priority,
    intervalSet: new Set(intervals),
  }));

  const findTrebleMatches = (trebleMidis) => {
    const treblePcs = new Set(trebleMidis.map(pitchClass));
    return [...treblePcs].flatMap((rootPc) => {
      const intervals = intervalsFromRoot(rootPc, treblePcs);
      const match = templateSets.find(({ intervalSet }) => setsEqual(intervals, intervalSet));
      return match ? [{ rootPc, suffix: match.suffix, priority: match.priority }] : [];
    });
  };

  const highestPriority = (matches) =>
    [...matches].sort((a, b) => b.priority - a.priority)[0];

  const chooseMatchByBass = (matches, bassPc) =>
    matches.find(({ rootPc }) => rootPc === bassPc) ?? highestPriority(matches);

  const findMatchWithBassAsRoot = (bassMidi, trebleMidis) => {
    const bassPc = pitchClass(bassMidi);
    const allPcs = new Set([bassPc, ...trebleMidis.map(pitchClass)]);
    const intervals = intervalsFromRoot(bassPc, allPcs);
    const match = templateSets.find(({ intervalSet }) => setsEqual(intervals, intervalSet));
    return match ? { rootPc: bassPc, suffix: match.suffix } : null;
  };

  const classify = ({ bassMidi, trebleMidis, bassAsRoot = false }) => {
    if (bassAsRoot) {
      const match = findMatchWithBassAsRoot(bassMidi, trebleMidis);
      if (match) return { rootPc: match.rootPc, suffix: match.suffix };
    }

    const matches = findTrebleMatches(trebleMidis);
    if (matches.length === 0) return null;

    const bassPc = pitchClass(bassMidi);
    const { rootPc, suffix } = chooseMatchByBass(matches, bassPc);
    return { rootPc, suffix, bassPc };
  };

  return { classify };
};
