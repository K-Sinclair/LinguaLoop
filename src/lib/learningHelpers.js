export function getCompletedConceptIds(progressRows = []) {
  return new Set(
    progressRows
      .filter((row) => Boolean(row?.completed_at))
      .map((row) => row.concept_id)
  );
}

export function getUnitProgress(unitId, concepts = [], progressRows = []) {
  const unitConcepts = concepts.filter((concept) => concept.unit_id === unitId);
  const completedIds = getCompletedConceptIds(progressRows);
  const completed = unitConcepts.filter((concept) => completedIds.has(concept.id)).length;
  const total = unitConcepts.length;

  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    isComplete: total > 0 && completed === total,
  };
}

export function getCourseProgress(units = [], concepts = [], progressRows = []) {
  const completedIds = getCompletedConceptIds(progressRows);
  const completedCards = concepts.filter((concept) => completedIds.has(concept.id)).length;
  const totalCards = concepts.length;
  const completedUnits = units.filter(
    (unit) => getUnitProgress(unit.id, concepts, progressRows).isComplete
  ).length;

  return {
    completedCards,
    totalCards,
    completedUnits,
    totalUnits: units.length,
    percent: totalCards === 0 ? 0 : Math.round((completedCards / totalCards) * 100),
  };
}

export function getNextUnit(units = [], concepts = [], progressRows = []) {
  return units.find(
    (unit) => !getUnitProgress(unit.id, concepts, progressRows).isComplete
  ) ?? null;
}
