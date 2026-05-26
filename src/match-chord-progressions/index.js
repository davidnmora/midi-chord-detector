import { formatChordName, hasDistinctBass } from '../chord-classifier/index.js';
import { noteNameToPitchClass } from '../chord-classifier/notes.js';
import { findSubProgressionMatches } from './match.js';

const parseProgressionChord = ({ noteName, suffix, bassNoteName }) => {
  const rootPc = noteNameToPitchClass(noteName);
  const bassPc = bassNoteName ? noteNameToPitchClass(bassNoteName) : undefined;
  const chord = hasDistinctBass({ rootPc, bassPc })
    ? { rootPc, suffix, bassPc }
    : { rootPc, suffix };
  return { ...chord, display: formatChordName(chord) };
};

const prepareSong = (song) => ({
  ...song,
  parsedProgression: song.progression.map(parseProgressionChord),
});

const buildSongResult = (preparedSong, searchProgression) => {
  const matches = findSubProgressionMatches(preparedSong.parsedProgression, searchProgression);
  return { song: preparedSong, matches };
};

const isMatched = ({ matches }) => matches.length > 0;

export const createProgressionSearch = ({ songs }) => {
  const preparedSongs = songs.map(prepareSong);

  let searchProgression = [];

  const getResults = () => {
    const allResults = preparedSongs.map((song) => buildSongResult(song, searchProgression));
    if (searchProgression.length === 0) return allResults;
    return allResults.filter(isMatched);
  };

  const append = (chord) => {
    searchProgression = [...searchProgression, chord];
  };

  const clear = () => {
    searchProgression = [];
  };

  return {
    append,
    clear,
    getSearchProgression: () => searchProgression,
    getResults,
  };
};

export {
  toAbstractProgression,
  findSubProgressionMatches,
  progressionContainsSubProgression,
  isPositionInMatch,
} from './match.js';
