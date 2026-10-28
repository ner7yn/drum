import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

function pluralDrums(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'барабан';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'барабана';
  return 'барабанов';
}

export default function KitListScreen({ kits, onOpenKit, onCreateKit }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Мои установки</Text>
      <FlatList
        data={kits}
        keyExtractor={(k) => k.id}
        ListEmptyComponent={<Text style={styles.empty}>Установок пока нет. Создайте первую.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.kitRow} onPress={() => onOpenKit(item.id)}>
            <Text style={styles.kitName}>{item.name}</Text>
            <Text style={styles.kitMeta}>
              {item.drums.length} {pluralDrums(item.drums.length)}
            </Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.newButton} onPress={onCreateKit}>
        <Text style={styles.newButtonText}>+ Новая установка</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.stage, padding: spacing(2), paddingTop: spacing(6) },
  title: { color: colors.cream, fontSize: 26, fontWeight: '700', marginBottom: spacing(3) },
  empty: { color: colors.creamDim, marginTop: spacing(4), textAlign: 'center' },
  kitRow: {
    backgroundColor: colors.stageElevated,
    borderRadius: 12,
    padding: spacing(2),
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  kitName: { color: colors.cream, fontSize: 18, fontWeight: '600' },
  kitMeta: { color: colors.creamDim, fontSize: 13, marginTop: 2 },
  newButton: {
    marginTop: spacing(1),
    paddingVertical: spacing(1.5),
    borderRadius: 10,
    backgroundColor: colors.brass,
    alignItems: 'center',
  },
  newButtonText: { color: colors.stage, fontWeight: '700' },
});
