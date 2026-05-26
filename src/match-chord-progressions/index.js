import { parseProgressionString } from './parse.js';
import { findSubProgressionMatches } from './match.js';

const prepareSong = (song) => ({
  ...song,
  parsedProgression: parseProgressionString(song.progression),
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

export { parseChordShorthand, parseProgressionString, formatChordShorthand } from './parse.js';
export {
  toAbstractProgression,
  findSubProgressionMatches,
  progressionContainsSubProgression,
  isPositionInMatch,
} from './match.js';
