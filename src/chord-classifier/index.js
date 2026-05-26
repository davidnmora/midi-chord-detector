import { NOTES_PER_OCTAVE, NOTE_NAMES, pitchClass } from './notes.js';
import { CHORD_TEMPLATES } from './templates.js';

export const UNKNOWN_CHORD_NAME = 'unknown';

const setsEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
};

const intervalsFromRoot = (rootPitchClass, pitchClasses) =>
  new Set([...pitchClasses].map((notePitchClass) => (notePitchClass - rootPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE));

export const hasDistinctBass = ({ rootPitchClass, bassPitchClass }) =>
  bassPitchClass !== undefined && bassPitchClass !== rootPitchClass;

export const bassIntervalFromRoot = (chord) =>
  hasDistinctBass(chord)
    ? (chord.bassPitchClass - chord.rootPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE
    : null;

export const structuredChordFromClassification = (classification) => {
  if (!classification) return null;
  const { rootPitchClass, suffix, bassPitchClass } = classification;
  return hasDistinctBass({ rootPitchClass, bassPitchClass })
    ? { rootPitchClass, suffix, bassPitchClass }
    : { rootPitchClass, suffix };
};

export const chordsAreEqual = (a, b) =>
  a.rootPitchClass === b.rootPitchClass &&
  a.suffix === b.suffix &&
  (hasDistinctBass(a) ? a.bassPitchClass : a.rootPitchClass) === (hasDistinctBass(b) ? b.bassPitchClass : b.rootPitchClass);

export const formatChordName = (chord) => {
  if (!chord) return UNKNOWN_CHORD_NAME;
  const { rootPitchClass, suffix, bassPitchClass } = chord;
  const base = `${NOTE_NAMES[rootPitchClass]} ${suffix}`;
  return hasDistinctBass(chord) ? `${base} / ${NOTE_NAMES[bassPitchClass]}` : base;
};

export const createChordClassifier = ({ templates = CHORD_TEMPLATES } = {}) => {
  const templateSets = templates.map(({ suffix, intervals, priority = 0 }) => ({
    suffix,
    priority,
    intervalSet: new Set(intervals),
  }));

  const findTrebleMatches = (trebleMidis) => {
    const treblePitchClasses = new Set(trebleMidis.map(pitchClass));
    return [...treblePitchClasses].flatMap((rootPitchClass) => {
      const intervals = intervalsFromRoot(rootPitchClass, treblePitchClasses);
      const match = templateSets.find(({ intervalSet }) => setsEqual(intervals, intervalSet));
      return match ? [{ rootPitchClass, suffix: match.suffix, priority: match.priority }] : [];
    });
  };

  const highestPriority = (matches) =>
    [...matches].sort((a, b) => b.priority - a.priority)[0];

  const chooseMatchByBass = (matches, bassPitchClass) =>
    matches.find(({ rootPitchClass }) => rootPitchClass === bassPitchClass) ?? highestPriority(matches);

  const findMatchWithBassAsRoot = (bassMidi, trebleMidis) => {
    const bassPitchClass = pitchClass(bassMidi);
    const allPitchClasses = new Set([bassPitchClass, ...trebleMidis.map(pitchClass)]);
    const intervals = intervalsFromRoot(bassPitchClass, allPitchClasses);
    const match = templateSets.find(({ intervalSet }) => setsEqual(intervals, intervalSet));
    return match ? { rootPitchClass: bassPitchClass, suffix: match.suffix } : null;
  };

  const classify = ({ bassMidi, trebleMidis, bassAsRoot = false }) => {
    if (bassAsRoot) {
      const match = findMatchWithBassAsRoot(bassMidi, trebleMidis);
      if (match) return { rootPitchClass: match.rootPitchClass, suffix: match.suffix };
    }

    const matches = findTrebleMatches(trebleMidis);
    if (matches.length === 0) return null;

    const bassPitchClass = pitchClass(bassMidi);
    const { rootPitchClass, suffix } = chooseMatchByBass(matches, bassPitchClass);
    return { rootPitchClass, suffix, bassPitchClass };
  };

  return { classify };
};
