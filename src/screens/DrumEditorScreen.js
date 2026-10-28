import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { centsBetween } from '../audio/notes';
import { DIAMETER_PRESETS, LUG_PRESETS } from '../constants';
import { DRUM_TYPES, drumTypeLabel, getDrumType, recommendedRange } from '../drumTypes';
import { resizeHeadLugs } from '../model';
import { colors, spacing } from '../theme';

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function summarizeHead(head, autoTarget) {
  const total = head.lugFreqs.length;
  const measured = head.lugFreqs.filter((f) => typeof f === 'number').length;
  if (!measured) return 'ещё не измерено тюнером';

  const target = head.targetFreq ?? head.centerFreq ?? autoTarget;
  if (!target) return `${measured} из ${total} винтов измерено`;

  const spreads = head.lugFreqs
    .filter((f) => typeof f === 'number')
    .map((f) => Math.abs(centsBetween(f, target)));
  const maxSpread = spreads.length ? Math.max(...spreads) : null;
  return `${measured} из ${total} винтов · макс. разброс ${maxSpread}¢`;
}

export default function DrumEditorScreen({ drum, onChange, onOpenTuner, onBack }) {
  const [customDiameter, setCustomDiameter] = useState('');
  const [customLugs, setCustomLugs] = useState('');

  function setLugCount(count) {
    const n = Math.max(2, Math.min(32, Math.round(count)));
    onChange({
      ...drum,
      lugCount: n,
      heads: {
        batter: resizeHeadLugs(drum.heads.batter, n),
        resonant: resizeHeadLugs(drum.heads.resonant, n),
      },
    });
  }

  // Смена типа ставит типовые диаметр и количество винтов — это стартовая
  // точка, дальше размер уточняется вручную. Измерения винтов сохраняются.
  function setType(typeId) {
    const spec = getDrumType(typeId);
    const lugCount = spec.defaultLugCount;
    onChange({
      ...drum,
      type: spec.id,
      diameter: spec.defaultDiameter,
      lugCount,
      heads: {
        batter: resizeHeadLugs(drum.heads.batter, lugCount),
        resonant: resizeHeadLugs(drum.heads.resonant, lugCount),
      },
    });
  }

  const range = recommendedRange(drum.type, drum.diameter);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing(6) }}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Установка</Text>
      </TouchableOpacity>

      <TextInput
        value={drum.name}
        onChangeText={(name) => onChange({ ...drum, name })}
        placeholder="Название барабана"
        placeholderTextColor={colors.creamDim}
        style={styles.nameInput}
      />
      <Text style={styles.caption}>
        {drumTypeLabel(drum.type)} · {drum.diameter}" · {drum.lugCount} винтов
      </Text>

      <Text style={styles.section}>Тип барабана</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {DRUM_TYPES.map((type) => (
          <Chip
            key={type.id}
            label={type.label}
            selected={drum.type === type.id}
            onPress={() => setType(type.id)}
          />
        ))}
      </ScrollView>
      <Text style={styles.hint}>
        Тип задаёт стартовые диаметр и число винтов и ориентир по частоте. Размер потом можно уточнить ниже.
      </Text>

      <Text style={styles.section}>Диаметр, дюймы</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {DIAMETER_PRESETS.map((d) => (
          <Chip key={d} label={`${d}"`} selected={drum.diameter === d} onPress={() => onChange({ ...drum, diameter: d })} />
        ))}
      </ScrollView>
      <View style={styles.customRow}>
        <TextInput
          value={customDiameter}
          onChangeText={setCustomDiameter}
          placeholder="свой размер, напр. 13.5"
          placeholderTextColor={colors.creamDim}
          keyboardType="decimal-pad"
          style={styles.customInput}
        />
        <TouchableOpacity
          style={styles.customButton}
          onPress={() => {
            const v = parseFloat(customDiameter.replace(',', '.'));
            if (!Number.isNaN(v) && v > 0) {
              onChange({ ...drum, diameter: v });
              setCustomDiameter('');
            }
          }}
        >
          <Text style={styles.customButtonText}>Применить</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Количество винтов крепления пластика</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {LUG_PRESETS.map((n) => (
          <Chip key={n} label={`${n}`} selected={drum.lugCount === n} onPress={() => setLugCount(n)} />
        ))}
      </ScrollView>
      <View style={styles.customRow}>
        <TextInput
          value={customLugs}
          onChangeText={setCustomLugs}
          placeholder="своё количество"
          placeholderTextColor={colors.creamDim}
          keyboardType="numeric"
          style={styles.customInput}
        />
        <TouchableOpacity
          style={styles.customButton}
          onPress={() => {
            const v = parseInt(customLugs, 10);
            if (!Number.isNaN(v) && v > 1) {
              setLugCount(v);
              setCustomLugs('');
            }
          }}
        >
          <Text style={styles.customButtonText}>Применить</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Тюнер</Text>
      <Text style={styles.hint}>
        Тюнер слушает удары через микрофон: опорный удар по центру и удар у каждого винта —
        отдельно для верхнего (бьющего) и нижнего (резонирующего) пластика.
      </Text>
      <Text style={styles.hint}>
        {range
          ? `Ориентир для «${drumTypeLabel(drum.type)}» ${drum.diameter}": ${range.min}–${range.max} Гц у винтов.`
          : 'Для этого типа барабана ориентира по частоте нет — задайте цель в тюнере вручную.'}
      </Text>

      <TouchableOpacity style={styles.tunerCard} onPress={() => onOpenTuner('batter')}>
        <View>
          <Text style={styles.tunerCardTitle}>Бьющий пластик</Text>
          <Text style={styles.tunerCardMeta}>{summarizeHead(drum.heads.batter, range?.center)}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tunerCard} onPress={() => onOpenTuner('resonant')}>
        <View>
          <Text style={styles.tunerCardTitle}>Резонирующий пластик</Text>
          <Text style={styles.tunerCardMeta}>{summarizeHead(drum.heads.resonant, range?.center)}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.stage, padding: spacing(2) },
  back: { color: colors.brass, marginVertical: spacing(2), fontSize: 15 },
  nameInput: {
    color: colors.cream,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing(1),
  },
  caption: { color: colors.creamDim, marginBottom: spacing(1) },
  section: { color: colors.cream, fontSize: 15, marginTop: spacing(3), marginBottom: spacing(1) },
  hint: { color: colors.creamDim, fontSize: 12, marginBottom: spacing(1.5) },
  row: { flexDirection: 'row' },
  chip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing(1),
    backgroundColor: colors.stageElevated,
  },
  chipSelected: { borderColor: colors.brass, backgroundColor: colors.shell },
  chipText: { color: colors.creamDim },
  chipTextSelected: { color: colors.brass, fontWeight: '600' },
  customRow: { flexDirection: 'row', marginTop: spacing(1), alignItems: 'center' },
  customInput: {
    flex: 1,
    color: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    marginRight: spacing(1),
  },
  customButton: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: 8,
    backgroundColor: colors.shell,
    borderWidth: 1,
    borderColor: colors.brassDim,
  },
  customButtonText: { color: colors.brass },
  tunerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stageElevated,
    borderRadius: 12,
    padding: spacing(2),
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  tunerCardTitle: { color: colors.cream, fontSize: 16, fontWeight: '600' },
  tunerCardMeta: { color: colors.creamDim, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.brassDim, fontSize: 20 },
});
