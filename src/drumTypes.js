// Типы барабанов и ориентировочные частоты настройки.
//
// Частота ниже — это то, что слышно при ударе у винта (lug frequency), то есть
// именно то, что измеряет тюнер. Чем больше диаметр, тем ниже тон, поэтому
// ориентир считается как «константа типа / диаметр в дюймах». Значения
// приблизительные: реальный тон зависит ещё от глубины обечайки, пластика и
// манеры игры, поэтому в приложении они подаются как рекомендация, а не как
// жёсткое требование.

export const DRUM_TYPES = [
  {
    id: 'kick',
    label: 'Бочка',
    defaultDiameter: 22,
    defaultLugCount: 8,
    freqPerInch: 1450,
    searchRatio: [0.5, 2.2],
  },
  {
    id: 'snare',
    label: 'Малый барабан',
    defaultDiameter: 14,
    defaultLugCount: 10,
    freqPerInch: 3900,
    searchRatio: [0.6, 1.8],
  },
  {
    id: 'rackTom',
    label: 'Подвесной том',
    defaultDiameter: 12,
    defaultLugCount: 6,
    freqPerInch: 3200,
    searchRatio: [0.5, 2],
  },
  {
    id: 'floorTom',
    label: 'Напольный том',
    defaultDiameter: 16,
    defaultLugCount: 8,
    freqPerInch: 2400,
    searchRatio: [0.5, 2],
  },
  {
    id: 'other',
    label: 'Другой барабан',
    defaultDiameter: 14,
    defaultLugCount: 8,
    freqPerInch: null,
    searchRatio: [0.5, 2],
  },
];

const TYPES_BY_ID = new Map(DRUM_TYPES.map((type) => [type.id, type]));

export function getDrumType(id) {
  return TYPES_BY_ID.get(id) ?? TYPES_BY_ID.get('other');
}

export function drumTypeLabel(id) {
  return getDrumType(id).label;
}

// Ориентировочная частота у винта для данного типа и диаметра.
// Для «другого барабана» рекомендации нет — вернётся null.
export function recommendedLugFreq(typeId, diameter) {
  const type = getDrumType(typeId);
  const size = Number(diameter) > 0 ? Number(diameter) : type.defaultDiameter;
  if (!type.freqPerInch) return null;
  return Math.round((type.freqPerInch / size) * 10) / 10;
}

// Диапазон ±10% вокруг ориентира — в нём барабан звучит «в строе» для своего типа.
export function recommendedRange(typeId, diameter) {
  const center = recommendedLugFreq(typeId, diameter);
  if (!center) return null;
  return {
    center,
    min: Math.round(center * 0.9 * 10) / 10,
    max: Math.round(center * 1.1 * 10) / 10,
  };
}

// Границы поиска высоты тона для тюнера: сужаем их под тип барабана, чтобы
// автокорреляция не уходила в октаву выше/ниже на шумном ударе.
export function pitchSearchRange(typeId, diameter) {
  const type = getDrumType(typeId);
  const center = recommendedLugFreq(typeId, diameter);
  if (!center) return { minFreq: 40, maxFreq: 500 };
  const [lowRatio, highRatio] = type.searchRatio;
  return {
    minFreq: Math.max(30, Math.round(center * lowRatio)),
    maxFreq: Math.min(500, Math.round(center * highRatio)),
  };
}

// Старые установки не знали о типах — определяем тип по диаметру.
export function inferDrumType(diameter) {
  const size = Number(diameter) || 14;
  if (size >= 20) return 'kick';
  if (size >= 15) return 'floorTom';
  if (size >= 13) return 'snare';
  return 'rackTom';
}
