export const CHORD_TEMPLATES = [
  // Three-note chords
  { suffix: 'major',      intervals: [0, 4, 7] },
  { suffix: 'minor',      intervals: [0, 3, 7] },
  { suffix: 'diminished', intervals: [0, 3, 6] },
  { suffix: 'augmented',  intervals: [0, 4, 8] },
  { suffix: 'sus2',       intervals: [0, 2, 7] },
  { suffix: 'sus4',       intervals: [0, 5, 7] },

  // Four-note chords
  { suffix: 'maj7',       intervals: [0, 4, 7, 11] },
  { suffix: '7',          intervals: [0, 4, 7, 10] },
  { suffix: 'minor maj7', intervals: [0, 3, 7, 11] },
  { suffix: 'add9',       intervals: [0, 2, 4, 7]  },
  { suffix: 'minor add9', intervals: [0, 2, 3, 7]  },
  { suffix: '7sus4',      intervals: [0, 5, 7, 10] },
  { suffix: 'm7b5',       intervals: [0, 3, 6, 10] },
  { suffix: 'dim7',       intervals: [0, 3, 6, 9]  },
  // minor7 and 6 share the same pitch-class set (e.g. D,F,A,C = D minor7 = F 6); prefer minor7 when bass doesn't resolve it
  { suffix: 'minor7',     intervals: [0, 3, 7, 10], priority: 1  },
  { suffix: '6',          intervals: [0, 4, 7, 9],  priority: -1 },

  // Five-note chords (require 5+ treble notes held simultaneously)
  { suffix: '9',          intervals: [0, 2, 4, 7, 10] },
  { suffix: 'maj9',       intervals: [0, 2, 4, 7, 11] },
  { suffix: 'minor9',     intervals: [0, 2, 3, 7, 10] },
  { suffix: '6/9',        intervals: [0, 2, 4, 7, 9]  },
];
