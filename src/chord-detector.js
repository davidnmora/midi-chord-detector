import { createMidiInput } from './midi-input/index.js';
import { createChordGater } from './chord-gater/index.js';
import { createChordClassifier } from './chord-classifier/index.js';
import { midiToNote } from './chord-classifier/notes.js';

const buildChordEvent = (bassMidi, trebleMidis, classifier) => ({
  bassNote: midiToNote(bassMidi),
  trebleNotes: trebleMidis.map(midiToNote),
  chordName: classifier.classify({ bassMidi, trebleMidis }),
  _bassMidi: bassMidi,
  _trebleMidis: trebleMidis,
});

export const createChordDetector = ({
  splitBassAndTrebleOn = 'C4',
  settleMs,
  onChordStart,
  onChordEnd,
  onStateChange,
  chordClassifierOptions,
} = {}) => {
  const classifier = createChordClassifier(chordClassifierOptions);

  let activeChordEvent = null;

  const chordGater = createChordGater({
    splitBassAndTrebleOn,
    settleMs,
    onStableChordCandidate: ({ bassMidi, trebleMidis }) => {
      activeChordEvent = buildChordEvent(bassMidi, trebleMidis, classifier);
      onChordStart?.(activeChordEvent);
    },
    onStableChordRelease: () => {
      if (!activeChordEvent) return;
      const ended = activeChordEvent;
      activeChordEvent = null;
      onChordEnd?.(ended);
    },
  });

  const midiInput = createMidiInput({
    onNoteOn: ({ midi }) => chordGater.handleNoteOn(midi),
    onNoteOff: ({ midi }) => chordGater.handleNoteOff(midi),
    onStateChange,
  });

  const connect = (options) => midiInput.connect(options);
  const disconnect = () => {
    midiInput.disconnect();
    chordGater.dispose();
    activeChordEvent = null;
  };

  return {
    connect,
    disconnect,
    listInputs: midiInput.listInputs,
    getActiveInput: midiInput.getActiveInput,
  };
};
