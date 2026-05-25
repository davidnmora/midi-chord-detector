const NOTE_ON_STATUS = 0x90;
const NOTE_OFF_STATUS = 0x80;
const STATUS_MASK = 0xf0;

const toDeviceInfo = (input, activeId) => ({
  id: input.id,
  name: input.name,
  manufacturer: input.manufacturer,
  state: input.state,
  connection: input.connection,
  type: input.type,
  version: input.version,
  isActive: input.id === activeId,
});

export const createMidiInput = ({ onNoteOn, onNoteOff, onStateChange } = {}) => {
  let midiAccess = null;
  let activeInput = null;

  const handleMidiMessage = (event) => {
    const [statusByte, note, velocity] = event.data;
    const status = statusByte & STATUS_MASK;

    if (status === NOTE_ON_STATUS && velocity > 0) {
      onNoteOn?.({ midi: note, velocity });
    } else if (status === NOTE_OFF_STATUS || (status === NOTE_ON_STATUS && velocity === 0)) {
      onNoteOff?.({ midi: note, velocity });
    }
  };

  const listInputs = () => {
    if (!midiAccess) return [];
    return [...midiAccess.inputs.values()].map((input) =>
      toDeviceInfo(input, activeInput?.id ?? null)
    );
  };

  const getActiveInput = () => {
    if (!midiAccess || !activeInput) return null;
    return toDeviceInfo(activeInput, activeInput.id);
  };

  const connect = async ({ inputName } = {}) => {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API is not supported in this browser.');
    }

    midiAccess = await navigator.requestMIDIAccess();

    midiAccess.onstatechange = () => onStateChange?.(listInputs());

    const inputs = [...midiAccess.inputs.values()];
    if (inputs.length === 0) throw new Error('No MIDI inputs found.');

    const chosen = inputName
      ? inputs.find((i) => i.name === inputName)
      : inputs[0];

    if (!chosen) throw new Error(`MIDI input "${inputName}" not found.`);

    if (activeInput) activeInput.onmidimessage = null;

    activeInput = chosen;
    activeInput.onmidimessage = handleMidiMessage;

    return getActiveInput();
  };

  const disconnect = () => {
    if (activeInput) {
      activeInput.onmidimessage = null;
      activeInput = null;
    }
  };

  return { connect, disconnect, listInputs, getActiveInput };
};
