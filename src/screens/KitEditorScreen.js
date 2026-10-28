import { useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DRUM_TYPES, drumTypeLabel } from '../drumTypes';
import { createDrum } from '../model';
import { colors, spacing } from '../theme';

// Имя новому барабану: «Бочка», а если такая уже есть — «Подвесной том 2».
function nextDrumName(typeId, drums) {
  const label = drumTypeLabel(typeId);
  const sameType = drums.filter((d) => d.type === typeId).length;
  return sameType === 0 ? label : `${label} ${sameType + 1}`;
}

export default function KitEditorScreen({ kit, onChangeKit, onOpenDrum, onBack, onSave, saved }) {
  const [pickingType, setPickingType] = useState(false);

  function addDrum(typeId) {
    const drum = createDrum(nextDrumName(typeId, kit.drums), { type: typeId });
    onChangeKit({ ...kit, drums: [...kit.drums, drum] });
    setPickingType(false);
  }

  function removeDrum(id) {
    Alert.alert('Удалить барабан?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => onChangeKit({ ...kit, drums: kit.drums.filter((d) => d.id !== id) }),
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Все установки</Text>
      </TouchableOpacity>

      <TextInput
        value={kit.name}
        onChangeText={(name) => onChangeKit({ ...kit, name })}
        style={styles.nameInput}
        placeholder="Название установки"
        placeholderTextColor={colors.creamDim}
      />

      <FlatList
        data={kit.drums}
        keyExtractor={(d) => d.id}
        ListEmptyComponent={<Text style={styles.empty}>Пока нет ни одного барабана. Добавьте первый.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.drumRow} onPress={() => onOpenDrum(item.id)} onLongPress={() => removeDrum(item.id)}>
            <View>
              <Text style={styles.drumName}>{item.name}</Text>
              <Text style={styles.drumMeta}>
                {drumTypeLabel(item.type)} · {item.diameter}" · {item.lugCount} винтов
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.hint}>Долгое нажатие на барабан — удалить его.</Text>

      {pickingType && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
          {DRUM_TYPES.map((type) => (
            <TouchableOpacity key={type.id} style={styles.typeChip} onPress={() => addDrum(type.id)}>
              <Text style={styles.typeChipText}>{type.label}</Text>
              <Text style={styles.typeChipMeta}>
                {type.defaultDiameter}" · {type.defaultLugCount} винтов
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => setPickingType((v) => !v)}>
        <Text style={styles.addButtonText}>{pickingType ? 'Отмена' : '+ Добавить барабан'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveButton} onPress={onSave}>
        <Text style={styles.saveButtonText}>{saved ? 'Сохранено ✓' : 'Сохранить установку'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.stage, padding: spacing(2) },
  back: { color: colors.brass, marginVertical: spacing(2), fontSize: 15 },
  nameInput: {
    color: colors.cream,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing(1),
  },
  empty: { color: colors.creamDim, marginTop: spacing(4), textAlign: 'center' },
  drumRow: {
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
  drumName: { color: colors.cream, fontSize: 16, fontWeight: '600' },
  drumMeta: { color: colors.creamDim, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.brassDim, fontSize: 20 },
  hint: { color: colors.creamDim, fontSize: 12, marginTop: spacing(1) },
  typeRow: { flexDirection: 'row', marginTop: spacing(1.5) },
  typeChip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDim,
    backgroundColor: colors.shell,
    marginRight: spacing(1),
  },
  typeChipText: { color: colors.brass, fontWeight: '600' },
  typeChipMeta: { color: colors.creamDim, fontSize: 11, marginTop: 2 },
  addButton: {
    marginTop: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDim,
    alignItems: 'center',
  },
  addButtonText: { color: colors.brass, fontWeight: '600' },
  saveButton: {
    marginTop: spacing(1.5),
    paddingVertical: spacing(1.5),
    borderRadius: 10,
    backgroundColor: colors.brass,
    alignItems: 'center',
  },
  saveButtonText: { color: colors.stage, fontWeight: '700' },
});
