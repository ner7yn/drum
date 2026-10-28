import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { centsBetween, freqToNote, parseTargetInput } from '../audio/notes';
import { useHitRecorder } from '../audio/recorder';
import DrumVisualizer from '../components/DrumVisualizer';
import { drumTypeLabel, pitchSearchRange, recommendedRange } from '../drumTypes';
import { colors, spacing } from '../theme';

const HEAD_LABELS = {
  batter: 'Бьющий пластик (сверху)',
  resonant: 'Резонирующий пластик (снизу)',
};

const ERROR_MESSAGES = {
  permission: 'Нет доступа к микрофону. Разрешите доступ в настройках телефона и попробуйте снова.',
  recording: 'Не удалось записать звук. Попробуйте ещё раз.',
  decode: 'Не удалось разобрать записанный звук.',
  no_hit: 'Удар не расслышан — ударьте увереннее и ближе к микрофону.',
  no_pitch: 'Не удалось различить высоту тона. Ударьте чётче, одним ударом, и повторите.',
  unsupported: 'Тюнер с микрофоном работает только в приложении на iOS или Android.',
};

function formatFreq(freq) {
  return typeof freq === 'number' ? `${freq.toFixed(1)} Гц` : '—';
}

function toneForCents(cents) {
  if (cents == null) return colors.creamDim;
  const abs = Math.abs(cents);
  if (abs <= 5) return colors.good;
  if (abs <= 15) return colors.warn;
  return colors.bad;
}

function averageOf(values) {
  const nums = values.filter((v) => typeof v === 'number');
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function ListenRow({ label, freq, action, active, onPress }) {
  const note = typeof freq === 'number' ? freqToNote(freq) : null;
  return (
    <TouchableOpacity style={styles.listenRow} onPress={onPress} disabled={active}>
      <View style={{ flex: 1 }}>
        <Text style={styles.listenLabel}>{label}</Text>
        <Text style={styles.listenValue}>
          {formatFreq(freq)}
          {note ? `  ·  ${note.name}` : ''}
        </Text>
      </View>
      <Text style={styles.listenAction}>{active ? '…' : action}</Text>
    </TouchableOpacity>
  );
}

function LugRow({ index, freq, target, active, onPress }) {
  const cents = typeof freq === 'number' && target ? centsBetween(freq, target) : null;
  const tone = toneForCents(cents);
  const direction = cents == null ? '' : cents > 2 ? '▼ ослабить' : cents < -2 ? '▲ подтянуть' : '✓ точно';
  const note = typeof freq === 'number' ? freqToNote(freq) : null;

  return (
    <TouchableOpacity style={styles.listenRow} onPress={onPress} disabled={active}>
      <View style={{ flex: 1 }}>
        <Text style={styles.listenLabel}>Винт {index + 1}</Text>
        <Text style={styles.listenValue}>
          {formatFreq(freq)}
          {note ? `  ·  ${note.name}` : ''}
        </Text>
        {cents != null && (
          <Text style={[styles.centsText, { color: tone }]}>
            {cents > 0 ? '+' : ''}
            {cents} центов · {direction}
          </Text>
        )}
      </View>
      <Text style={styles.listenAction}>{active ? '…' : typeof freq === 'number' ? 'Переслушать' : 'Удар'}</Text>
    </TouchableOpacity>
  );
}

function VisualizerPanel({ head, target }) {
  const lugColors = head.lugFreqs.map((f) => (typeof f === 'number' && target ? toneForCents(centsBetween(f, target)) : colors.line));
  const centerColor = typeof head.centerFreq === 'number' ? colors.brass : colors.brassDim;
  return <DrumVisualizer lugCount={head.lugFreqs.length} lugColors={lugColors} centerColor={centerColor} />;
}

export default function TunerScreen({ drum, headKey, onChangeHead, onBack }) {
  const head = drum.heads[headKey];
  const captureHit = useHitRecorder();
  const [listening, setListening] = useState(null); // 'center' | номер винта | null
  const [targetText, setTargetText] = useState(head.targetFreq ? head.targetFreq.toFixed(1) : '');
  const [error, setError] = useState(null);

  // Ориентир по типу барабана: у бочки он ниже, у малого барабана выше.
  const typeRange = recommendedRange(drum.type, drum.diameter);
  const searchRange = useMemo(
    () => pitchSearchRange(drum.type, drum.diameter),
    [drum.type, drum.diameter]
  );

  const targetSource = head.targetFreq
    ? 'manual'
    : head.centerFreq
      ? 'center'
      : typeRange
        ? 'type'
        : null;

  const effectiveTarget = useMemo(
    () => head.targetFreq ?? head.centerFreq ?? typeRange?.center ?? averageOf(head.lugFreqs),
    [head.targetFreq, head.centerFreq, head.lugFreqs, typeRange]
  );

  async function handleListen(position) {
    setError(null);
    setListening(position);
    const result = await captureHit(searchRange);
    setListening(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (position === 'center') {
      onChangeHead({ ...head, centerFreq: result.freq });
    } else {
      const nextLugs = head.lugFreqs.slice();
      nextLugs[position] = result.freq;
      onChangeHead({ ...head, lugFreqs: nextLugs });
    }
  }

  function applyTarget() {
    const freq = parseTargetInput(targetText);
    onChangeHead({ ...head, targetFreq: freq });
    if (freq) setTargetText(freq.toFixed(1));
  }

  function clearTarget() {
    setTargetText('');
    onChangeHead({ ...head, targetFreq: null });
  }

  const targetCaption = !effectiveTarget
    ? 'Опорная высота ещё не задана'
    : targetSource === 'manual'
      ? `Цель: ${formatFreq(effectiveTarget)} (задана вручную)`
      : targetSource === 'center'
        ? `Опорная высота: ${formatFreq(effectiveTarget)} (по удару в центр)`
        : `Ориентир для «${drumTypeLabel(drum.type)}» ${drum.diameter}": ${formatFreq(effectiveTarget)}`;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing(6) }}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← {drum.name}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{HEAD_LABELS[headKey]}</Text>

      <VisualizerPanel head={head} target={effectiveTarget} />
      <Text style={styles.caption}>{targetCaption}</Text>
      {typeRange && (
        <Text style={styles.rangeHint}>
          Рекомендуемый диапазон: {typeRange.min}–{typeRange.max} Гц
        </Text>
      )}

      <Text style={styles.section}>Своя цель (необязательно)</Text>
      <View style={styles.targetRow}>
        <TextInput
          value={targetText}
          onChangeText={setTargetText}
          onEndEditing={applyTarget}
          placeholder={typeRange ? `например ${typeRange.center}` : 'например 110 или D2'}
          placeholderTextColor={colors.creamDim}
          style={styles.targetInput}
        />
        <TouchableOpacity style={styles.smallButton} onPress={applyTarget}>
          <Text style={styles.smallButtonText}>Задать</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Можно ввести частоту в Гц или название ноты (D2, F#1…). Если цель не задана, ориентиром
        служит удар по центру ниже, а до него — рекомендация для типа барабана.
      </Text>
      {head.targetFreq != null && (
        <TouchableOpacity onPress={clearTarget}>
          <Text style={styles.linkButton}>Сбросить цель</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.section, { marginTop: spacing(3) }]}>Опорный удар по центру пластика</Text>
      <ListenRow
        label="Центр"
        freq={head.centerFreq}
        active={listening === 'center'}
        action={typeof head.centerFreq === 'number' ? 'Переслушать' : 'Удар'}
        onPress={() => handleListen('center')}
      />

      <Text style={[styles.section, { marginTop: spacing(3) }]}>Удар у каждого винта</Text>
      <Text style={styles.hint}>Бейте в точке на пару сантиметров от обода, напротив каждого винта.</Text>
      {head.lugFreqs.map((freq, i) => (
        <LugRow key={i} index={i} freq={freq} target={effectiveTarget} active={listening === i} onPress={() => handleListen(i)} />
      ))}

      {error && <Text style={styles.error}>{ERROR_MESSAGES[error] || 'Не получилось. Попробуйте ещё раз.'}</Text>}

      {listening !== null && (
        <View style={styles.listeningBanner}>
          <ActivityIndicator color={colors.brass} />
          <Text style={styles.listeningText}>Слушаю… ударьте сейчас</Text>
        </View>
      )}

      {Platform.OS === 'web' && <Text style={styles.error}>{ERROR_MESSAGES.unsupported}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.stage, padding: spacing(2) },
  back: { color: colors.brass, marginVertical: spacing(2), fontSize: 15 },
  title: { color: colors.cream, fontSize: 20, fontWeight: '700', marginVertical: spacing(2) },
  caption: { color: colors.creamDim, textAlign: 'center', marginTop: spacing(1), marginBottom: spacing(0.5) },
  rangeHint: { color: colors.brassDim, textAlign: 'center', fontSize: 12, marginBottom: spacing(1) },
  linkButton: { color: colors.brass, fontSize: 13, marginTop: spacing(0.5) },
  section: { color: colors.cream, fontSize: 15, marginBottom: spacing(1) },
  targetRow: { flexDirection: 'row', alignItems: 'center' },
  targetInput: {
    flex: 1,
    color: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    marginRight: spacing(1),
  },
  smallButton: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: 8,
    backgroundColor: colors.shell,
    borderWidth: 1,
    borderColor: colors.brassDim,
  },
  smallButtonText: { color: colors.brass },
  hint: { color: colors.creamDim, fontSize: 12, marginBottom: spacing(1) },
  listenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stageElevated,
    borderRadius: 12,
    padding: spacing(1.5),
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  listenLabel: { color: colors.cream, fontSize: 14, fontWeight: '600' },
  listenValue: { color: colors.creamDim, fontSize: 13, marginTop: 2 },
  listenAction: { color: colors.brass, fontSize: 13, marginLeft: spacing(1) },
  centsText: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  error: { color: colors.bad, marginTop: spacing(2), textAlign: 'center' },
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: 10,
    backgroundColor: colors.stageElevated,
    borderWidth: 1,
    borderColor: colors.brassDim,
  },
  listeningText: { color: colors.cream, marginLeft: spacing(1) },
});
