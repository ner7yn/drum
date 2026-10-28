import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeDrum } from './model';

const STORAGE_KEY = 'drumtune.kits.v2';

export async function loadKits() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // приводим каждый барабан к актуальной форме — на случай, если установка
    // была сохранена более ранней версией приложения
    return parsed.map((kit) => ({
      ...kit,
      drums: (kit.drums || []).map(normalizeDrum),
    }));
  } catch (e) {
    console.warn('Не удалось загрузить сохранённые установки', e);
    return [];
  }
}

export async function persistKits(kits) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kits));
    return true;
  } catch (e) {
    console.warn('Не удалось сохранить установки', e);
    return false;
  }
}
