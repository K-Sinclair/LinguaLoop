import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCompletedConceptIds,
  getCourseProgress,
  getNextUnit,
  getUnitProgress,
} from './learningHelpers.js';

const units = [
  { id: 'unit-1', sort_order: 0 },
  { id: 'unit-2', sort_order: 1 },
];

const concepts = [
  { id: 'a', unit_id: 'unit-1' },
  { id: 'b', unit_id: 'unit-1' },
  { id: 'c', unit_id: 'unit-2' },
];

test('getCompletedConceptIds ignores incomplete progress rows', () => {
  const ids = getCompletedConceptIds([
    { concept_id: 'a', completed_at: '2026-08-01T00:00:00Z' },
    { concept_id: 'b', completed_at: null },
  ]);

  assert.deepEqual([...ids], ['a']);
});

test('getUnitProgress calculates honest card completion', () => {
  const result = getUnitProgress('unit-1', concepts, [
    { concept_id: 'a', completed_at: '2026-08-01T00:00:00Z' },
  ]);

  assert.deepEqual(result, {
    completed: 1,
    total: 2,
    percent: 50,
    isComplete: false,
  });
});

test('getCourseProgress counts completed cards and units', () => {
  const result = getCourseProgress(units, concepts, [
    { concept_id: 'a', completed_at: '2026-08-01T00:00:00Z' },
    { concept_id: 'b', completed_at: '2026-08-01T00:00:00Z' },
  ]);

  assert.equal(result.completedCards, 2);
  assert.equal(result.completedUnits, 1);
  assert.equal(result.percent, 67);
});

test('getNextUnit selects the first unfinished unit', () => {
  const progress = [
    { concept_id: 'a', completed_at: '2026-08-01T00:00:00Z' },
    { concept_id: 'b', completed_at: '2026-08-01T00:00:00Z' },
  ];

  assert.equal(getNextUnit(units, concepts, progress)?.id, 'unit-2');
});

test('getNextUnit returns null when every unit is complete', () => {
  const progress = concepts.map((concept) => ({
    concept_id: concept.id,
    completed_at: '2026-08-01T00:00:00Z',
  }));

  assert.equal(getNextUnit(units, concepts, progress), null);
});
