import { NOTES_PER_OCTAVE } from '../chord-classifier/notes.js';

const intervalBetweenRoots = (fromPc, toPc) =>
  (toPc - fromPc + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

export const toAbstractProgression = (chords) => ({
  suffixes: chords.map(({ suffix }) => suffix),
  deltas: chords.slice(1).map(({ rootPc }, i) =>
    intervalBetweenRoots(chords[i].rootPc, rootPc)
  ),
});

const arraysEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const abstractProgressionsMatch = (a, b) =>
  arraysEqual(a.suffixes, b.suffixes) && arraysEqual(a.deltas, b.deltas);

const sliceCyclic = (array, start, length) =>
  Array.from({ length }, (_, i) => array[(start + i) % array.length]);

export const findSubProgressionMatches = (
  songProgression,
  searchProgression,
  { wrap = true } = {}
) => {
  if (searchProgression.length === 0) return [];
  if (searchProgression.length > songProgression.length) return [];

  const searchAbstract = toAbstractProgression(searchProgression);
  const lastStart = wrap
    ? songProgression.length - 1
    : songProgression.length - searchProgression.length;

  return Array.from({ length: lastStart + 1 }, (_, start) => start).flatMap((start) => {
    const window = sliceCyclic(songProgression, start, searchProgression.length);
    return abstractProgressionsMatch(toAbstractProgression(window), searchAbstract)
      ? [{ start, length: searchProgression.length }]
      : [];
  });
};

export const progressionContainsSubProgression = (songProgression, searchProgression, options) =>
  findSubProgressionMatches(songProgression, searchProgression, options).length > 0;

export const isPositionInMatch = (position, { start, length }, songLength) => {
  const offsetsInMatch = Array.from({ length }, (_, i) => (start + i) % songLength);
  return offsetsInMatch.includes(position);
};
