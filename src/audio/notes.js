// Преобразование между частотой (Гц) и названием ноты, плюс разница в центах
// между измеренной и опорной частотой — это то, что подсказывает,
// подтягивать винт или ослаблять.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function freqToNote(freq) {
  if (!freq || freq <= 0) return null;
  const midi = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { name: `${name}${octave}`, cents, midi: rounded };
}

export function noteToFreq(input) {
  const match = /^([A-Ga-g])(#|b)?(-?\d+)$/.exec(input.trim());
  if (!match) return null;
  const letters = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitone = letters[match[1].toUpperCase()];
  if (match[2] === '#') semitone += 1;
  if (match[2] === 'b') semitone -= 1;
  const octave = parseInt(match[3], 10);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Принимает либо число (Гц), либо название ноты вроде "D2", "F#1", "Eb3"
export function parseTargetInput(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return null;
  if (/^[A-Ga-g]/.test(trimmed)) {
    const f = noteToFreq(trimmed);
    return f && f > 0 ? f : null;
  }
  const n = parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function centsBetween(freq, referenceFreq) {
  if (!freq || !referenceFreq) return null;
  return Math.round(1200 * Math.log2(freq / referenceFreq));
}
