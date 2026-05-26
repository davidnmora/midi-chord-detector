import { createMidiInput } from './midi-input/index.js';
import { createChordGater } from './chord-gater/index.js';
import { createChordClassifier, formatChordName } from './chord-classifier/index.js';
import { midiToNote } from './chord-classifier/notes.js';

const toStructuredChord = (classification) =>
  classification ? { rootPc: classification.rootPc, suffix: classification.suffix } : null;

const buildChordEvent = (bassMidi, trebleMidis, classifier, bassAsRoot) => {
  const classification = classifier.classify({ bassMidi, trebleMidis, bassAsRoot });
  return {
    bassNote: midiToNote(bassMidi),
    trebleNotes: trebleMidis.map(midiToNote),
    chordName: formatChordName(classification),
    chord: toStructuredChord(classification),
    _bassMidi: bassMidi,
    _trebleMidis: trebleMidis,
  };
};

export const createChordDetector = ({
  splitBassAndTrebleOn = 'C4',
  settleMs,
  onChordStart,
  onChordEnd,
  onStateChange,
  chordClassifierOptions,
  getBassAsRoot,
} = {}) => {
  const classifier = createChordClassifier(chordClassifierOptions);

  let activeChordEvent = null;

  const chordGater = createChordGater({
    splitBassAndTrebleOn,
    settleMs,
    onStableChordCandidate: ({ bassMidi, trebleMidis }) => {
      activeChordEvent = buildChordEvent(bassMidi, trebleMidis, classifier, getBassAsRoot?.() ?? false);
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

  const reclassify = () => {
    if (!activeChordEvent) return;
    const { _bassMidi, _trebleMidis } = activeChordEvent;
    activeChordEvent = buildChordEvent(_bassMidi, _trebleMidis, classifier, getBassAsRoot?.() ?? false);
    onChordStart?.(activeChordEvent);
  };

  const connect = (options) => midiInput.connect(options);
  const disconnect = () => {
    midiInput.disconnect();
    chordGater.dispose();
    activeChordEvent = null;
  };

  return {
    connect,
    disconnect,
    reclassify,
    listInputs: midiInput.listInputs,
    getActiveInput: midiInput.getActiveInput,
  };
};
