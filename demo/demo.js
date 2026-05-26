import { createChordDetector, formatChordName } from '../src/index.js';
import { createProgressionSearch, isPositionInMatch } from '../src/match-chord-progressions/index.js';
import { SONGS } from './songs.js';

const $ = (id) => document.getElementById(id);

const ESCAPE_HTML_PATTERN = /[&<>"']/g;
const ESCAPE_HTML_REPLACEMENTS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value) =>
  String(value).replace(ESCAPE_HTML_PATTERN, (character) =>
    character in ESCAPE_HTML_REPLACEMENTS ? ESCAPE_HTML_REPLACEMENTS[character] : character
  );

const octaveSubHtml = (octave) =>
  `<sub class="inline align-baseline text-[0.72em] text-zinc-500">${escapeHtml(String(octave))}</sub>`;

const formatNoteHtml = ({ noteName, octave }) =>
  `<span class="text-white">${escapeHtml(noteName)}</span>${octaveSubHtml(octave)}`;

const LIVE_OUTPUT_ID = 'live-output';
const LIVE_STATE_MUTED = 'muted';
const LIVE_STATE_ACTIVE = 'active';
const MIDI_SETUP_ID = 'midi-setup';
const MIDI_SETUP_STATE_IDLE = 'idle';
const MIDI_SETUP_STATE_LINKED = 'linked';

const reflectMidiConnectedUi = (isConnected) => {
  $(LIVE_OUTPUT_ID)?.setAttribute(
    'data-live-state',
    isConnected ? LIVE_STATE_ACTIVE : LIVE_STATE_MUTED
  );
  $(MIDI_SETUP_ID)?.setAttribute(
    'data-midi-state',
    isConnected ? MIDI_SETUP_STATE_LINKED : MIDI_SETUP_STATE_IDLE
  );
};

const renderDeviceList = (inputs) => {
  const list = $('device-list');
  const countEl = $('input-count');
  const switcher = $('input-switcher');
  const select = $('input-select');

  if (!inputs || inputs.length === 0) {
    list.innerHTML = '<span class="text-zinc-500 italic">No MIDI inputs found</span>';
    countEl.textContent = '0 inputs';
    switcher.classList.add('hidden');
    return;
  }

  countEl.textContent = `${inputs.length} input${inputs.length !== 1 ? 's' : ''}`;

  list.innerHTML = inputs
    .map(
      (d) => `
      <div class="flex items-start gap-3 border border-zinc-800 rounded p-3 ${d.isActive ? 'border-indigo-700 bg-indigo-950/30' : ''}">
        <div class="flex-1 space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-white font-medium">${d.name || 'Unknown device'}</span>
            ${d.isActive ? '<span class="text-indigo-400 text-xs border border-indigo-700 rounded px-1.5 py-0.5">active</span>' : ''}
          </div>
          <div class="grid grid-cols-3 gap-x-4 gap-y-0.5 text-zinc-500">
            ${d.manufacturer ? `<span>Manufacturer: <span class="text-zinc-400">${d.manufacturer}</span></span>` : ''}
            <span>State: <span class="${d.state === 'connected' ? 'text-green-400' : 'text-red-400'}">${d.state}</span></span>
            <span>Connection: <span class="text-zinc-400">${d.connection}</span></span>
            ${d.version ? `<span>Version: <span class="text-zinc-400">${d.version}</span></span>` : ''}
            <span class="col-span-2 truncate">ID: <span class="text-zinc-600">${d.id}</span></span>
          </div>
        </div>
      </div>`
    )
    .join('');

  const previousValue = select.value;
  select.innerHTML = inputs
    .map((d) => `<option value="${d.name}" ${d.isActive ? 'selected' : ''}>${d.name}</option>`)
    .join('');
  if (previousValue && [...select.options].some((o) => o.value === previousValue)) {
    select.value = previousValue;
  }

  switcher.classList.remove('hidden');
};

const appendLogLine = (html) => {
  const log = $('event-log');
  const wasEmpty = log.querySelector('span.italic');
  if (wasEmpty) log.innerHTML = '';
  const line = document.createElement('div');
  line.innerHTML = html;
  log.prepend(line);
};

const renderActiveChord = (chord) => {
  const bassDisplay = $('bass-display');
  const trebleDisplay = $('treble-display');
  if (!chord) {
    $('chord-display').textContent = '—';
    $('chord-display').className = 'text-4xl font-semibold text-zinc-600 tracking-tight';
    bassDisplay.textContent = '—';
    trebleDisplay.textContent = '—';
    return;
  }
  $('chord-display').textContent = chord.chordName;
  $('chord-display').className = 'text-4xl font-semibold text-white tracking-tight';
  bassDisplay.innerHTML = formatNoteHtml(chord.bassNote);
  trebleDisplay.innerHTML = chord.trebleNotes.map(formatNoteHtml).join(', ');
};

const search = createProgressionSearch({ songs: SONGS });

const SEARCH_PLACEHOLDER_CLASS = 'text-sm text-zinc-500 italic min-h-[1.5rem]';
const SEARCH_FILLED_CLASS = 'text-sm text-white min-h-[1.5rem] flex flex-wrap items-center gap-2';
const SEARCH_ARROW = '<span class="text-zinc-600">→</span>';
const SEARCH_CHIP_CLASS = 'bg-indigo-950/60 border border-indigo-800/60 rounded px-2 py-0.5';
const HIGHLIGHTED_CHORD_CLASS = 'bg-indigo-700 text-white rounded px-1.5 py-0.5 font-medium';
const PLAIN_CHORD_CLASS = 'text-zinc-400 px-1.5 py-0.5';
const MATCHED_SONG_CARD_CLASS = 'p-2.5 bg-indigo-950/20 border border-indigo-900/40 rounded space-y-1';
const PLAIN_SONG_CARD_CLASS = 'p-2.5 border border-zinc-800 rounded space-y-1';

const renderSearchProgression = () => {
  const display = $('search-progression');
  const chords = search.getSearchProgression();
  if (chords.length === 0) {
    display.className = SEARCH_PLACEHOLDER_CLASS;
    display.textContent = 'Play a chord to start searching…';
    return;
  }
  display.className = SEARCH_FILLED_CLASS;
  display.innerHTML = chords
    .map((chord) => `<span class="${SEARCH_CHIP_CLASS}">${escapeHtml(formatChordName(chord))}</span>`)
    .join(SEARCH_ARROW);
};

const renderProgressionChords = ({ parsedProgression, matches }) => {
  const songLength = parsedProgression.length;
  return parsedProgression
    .map((chord, position) => {
      const highlighted = matches.some((match) => isPositionInMatch(position, match, songLength));
      const cls = highlighted ? HIGHLIGHTED_CHORD_CLASS : PLAIN_CHORD_CLASS;
      return `<span class="${cls}">${escapeHtml(chord.display)}</span>`;
    })
    .join('<span class="text-zinc-700">·</span>');
};

const renderSongResult = ({ song, matches }) => `
  <div class="${matches.length > 0 ? MATCHED_SONG_CARD_CLASS : PLAIN_SONG_CARD_CLASS}">
    <div>
      <span class="text-white font-medium">${escapeHtml(song.title)}</span>
      <span class="text-zinc-500"> — ${escapeHtml(song.artist)}</span>
    </div>
    <div class="flex flex-wrap items-center gap-1">
      ${renderProgressionChords({ parsedProgression: song.parsedProgression, matches })}
    </div>
  </div>
`;

const renderSearchResults = () => {
  const list = $('search-results');
  const results = search.getResults();
  const hasSearch = search.getSearchProgression().length > 0;
  if (hasSearch && results.length === 0) {
    list.innerHTML =
      '<div class="text-zinc-500 italic">No songs match this progression. Clear to start over.</div>';
    return;
  }
  list.innerHTML = results.map(renderSongResult).join('');
};

const refreshSearch = () => {
  renderSearchProgression();
  renderSearchResults();
};

const chordsAreEqual = (a, b) =>
  a.rootPc === b.rootPc && a.suffix === b.suffix;

const appendChordIfNew = (chord) => {
  const progression = search.getSearchProgression();
  const lastChord = progression[progression.length - 1];
  if (lastChord && chordsAreEqual(chord, lastChord)) return;
  search.append(chord);
  refreshSearch();
};

const ESCAPE_KEY = 'Escape';

const clearSearch = () => {
  search.clear();
  refreshSearch();
};

let detector = null;

const buildDetector = () => {
  const splitBassAndTrebleOn = $('split-note').value.trim() || 'C4';
  const settleMs = parseInt($('settle-ms').value, 10) || 60;

  return createChordDetector({
    splitBassAndTrebleOn,
    settleMs,
    getBassAsRoot: () => $('bass-as-root').checked,
    onChordStart: (chord) => {
      renderActiveChord(chord);
      if (chord.chord) {
        appendChordIfNew(chord.chord);
      }
      const treble = chord.trebleNotes.map(formatNoteHtml).join(', ');
      appendLogLine(
        `<span class="text-indigo-400">▶ start:</span> <span class="text-white font-medium">${escapeHtml(
          chord.chordName
        )}</span> <span class="text-zinc-500">— ${formatNoteHtml(chord.bassNote)} / ${treble}</span>`
      );
    },
    onChordEnd: (chord) => {
      renderActiveChord(null);
      appendLogLine(
        `<span class="text-zinc-500">■ end:&nbsp;&nbsp;</span> <span class="text-zinc-300">${escapeHtml(chord.chordName)}</span>`
      );
    },
    onStateChange: (inputs) => {
      renderDeviceList(inputs);
    },
  });
};

const attemptConnect = async () => {
  const errorEl = $('connect-error');
  errorEl.classList.add('hidden');

  if (!window.isSecureContext) {
    const banner = $('no-midi-banner');
    banner.textContent =
      'Web MIDI requires a secure context. Open this page via http://localhost (not file:// or a remote http:// URL).';
    banner.classList.remove('hidden');
    return;
  }

  if (!navigator.requestMIDIAccess) {
    const banner = $('no-midi-banner');
    banner.textContent = 'Web MIDI API is not supported in this browser. Try Chrome or Edge.';
    banner.classList.remove('hidden');
    return;
  }

  if (detector) detector.disconnect();

  detector = buildDetector();

  try {
    await detector.connect();
    renderDeviceList(detector.listInputs());
    reflectMidiConnectedUi(true);
    $('connect-btn').classList.add('hidden');
    $('disconnect-btn').classList.remove('hidden');
    appendLogLine('<span class="text-green-400">● connected</span>');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
};

$('connect-btn').addEventListener('click', attemptConnect);

window.addEventListener('load', async () => {
  if (window.isSecureContext && navigator.requestMIDIAccess) {
    await attemptConnect();
  }
});

$('disconnect-btn').addEventListener('click', () => {
  detector?.disconnect();
  detector = null;
  renderDeviceList([]);
  renderActiveChord(null);
  reflectMidiConnectedUi(false);
  $('connect-btn').classList.remove('hidden');
  $('disconnect-btn').classList.add('hidden');
  appendLogLine('<span class="text-zinc-500">○ disconnected</span>');
});

$('input-select').addEventListener('change', async () => {
  if (!detector) return;
  const inputName = $('input-select').value;
  try {
    await detector.connect({ inputName });
    renderDeviceList(detector.listInputs());
    appendLogLine(
      `<span class="text-zinc-400">⇄ switched to</span> <span class="text-white">${escapeHtml(inputName)}</span>`
    );
  } catch (err) {
    $('connect-error').textContent = err.message;
    $('connect-error').classList.remove('hidden');
  }
});

$('clear-log').addEventListener('click', () => {
  $('event-log').innerHTML = '<span class="text-zinc-500 italic">Waiting for events…</span>';
});

$('clear-search').addEventListener('click', clearSearch);

window.addEventListener('keydown', (event) => {
  if (event.key === ESCAPE_KEY) {
    clearSearch();
  }
});

refreshSearch();

$('bass-as-root').addEventListener('change', () => {
  detector?.reclassify();
});
