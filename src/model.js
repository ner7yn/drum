import { getDrumType, inferDrumType } from './drumTypes';
import { makeId } from './utils';

// Каждый барабан теперь хранит измерения отдельно для бьющего (batter) и
// резонирующего (resonant) пластика: опорную частоту по центру, свою
// заданную цель (необязательно) и частоту, услышанную у каждого винта.
export function createHead(lugCount) {
  return {
    centerFreq: null,
    targetFreq: null,
    lugFreqs: Array.from({ length: lugCount }).map(() => null),
  };
}

// Тип барабана задаёт стартовые диаметр и количество винтов — их потом можно
// уточнить в настройках барабана. Ориентир по частоте не хранится в пластике:
// он всегда считается из типа и диаметра, поэтому не устаревает, когда
// пользователь меняет размер.
export function createDrum(name, { type = 'other', diameter, lugCount } = {}) {
  const spec = getDrumType(type);
  const size = diameter ?? spec.defaultDiameter;
  const lugs = lugCount ?? spec.defaultLugCount;
  return {
    id: makeId(),
    name,
    type: spec.id,
    diameter: size,
    lugCount: lugs,
    heads: {
      batter: createHead(lugs),
      resonant: createHead(lugs),
    },
  };
}

// Стандартная установка: бочка, малый, два подвесных тома и напольный том.
export function createDefaultKit(name = 'Новая установка') {
  return {
    id: makeId(),
    name,
    drums: [
      createDrum('Бочка', { type: 'kick' }),
      createDrum('Малый барабан', { type: 'snare' }),
      createDrum('Подвесной том 1', { type: 'rackTom', diameter: 10, lugCount: 6 }),
      createDrum('Подвесной том 2', { type: 'rackTom', diameter: 12, lugCount: 6 }),
      createDrum('Напольный том', { type: 'floorTom' }),
    ],
  };
}

export function resizeHeadLugs(head, lugCount) {
  const next = Array.from({ length: lugCount }).map((_, i) => head.lugFreqs[i] ?? null);
  return { ...head, lugFreqs: next };
}

// Приводит барабан (в т.ч. сохранённый более старой версией приложения)
// к актуальной форме, чтобы ничего не падало при загрузке старых установок.
export function normalizeDrum(drum) {
  const lugCount = drum.lugCount ?? 8;
  const diameter = drum.diameter ?? 14;
  const type = getDrumType(drum.type ?? inferDrumType(diameter)).id;
  const rawHeads = drum.heads && drum.heads.batter && drum.heads.resonant ? drum.heads : {};
  const heads = {};
  for (const key of ['batter', 'resonant']) {
    const head = rawHeads[key] || createHead(lugCount);
    heads[key] =
      Array.isArray(head.lugFreqs) && head.lugFreqs.length === lugCount ? head : resizeHeadLugs(head, lugCount);
  }
  return {
    id: drum.id ?? makeId(),
    name: drum.name ?? 'Барабан',
    type,
    diameter,
    lugCount,
    heads,
  };
}
