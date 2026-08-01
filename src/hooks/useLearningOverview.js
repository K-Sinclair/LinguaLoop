import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import {
  getCourseProgress,
  getNextUnit,
  getUnitProgress,
} from '../lib/learningHelpers.js';

export function useLearningOverview(userId, learningLanguageId) {
  const [language, setLanguage] = useState(null);
  const [units, setUnits] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!userId || !learningLanguageId) {
      setLanguage(null);
      setUnits([]);
      setConcepts([]);
      setProgressRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [languageResult, unitsResult] = await Promise.all([
      supabase
        .from('languages')
        .select('id, code, name')
        .eq('id', learningLanguageId)
        .maybeSingle(),
      supabase
        .from('units')
        .select('id, language_id, slug, title, description, sort_order')
        .eq('language_id', learningLanguageId)
        .order('sort_order'),
    ]);

    const firstError = languageResult.error ?? unitsResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const loadedUnits = unitsResult.data ?? [];
    const unitIds = loadedUnits.map((unit) => unit.id);
    let loadedConcepts = [];

    if (unitIds.length > 0) {
      const conceptsResult = await supabase
        .from('concepts')
        .select('id, unit_id, slug, difficulty, sort_order')
        .in('unit_id', unitIds)
        .order('sort_order');

      if (conceptsResult.error) {
        setError(conceptsResult.error.message);
        setLoading(false);
        return;
      }

      loadedConcepts = conceptsResult.data ?? [];
    }

    const conceptIds = loadedConcepts.map((concept) => concept.id);
    let loadedProgress = [];

    if (conceptIds.length > 0) {
      const progressResult = await supabase
        .from('progress')
        .select('concept_id, completed_at, score')
        .eq('user_id', userId)
        .in('concept_id', conceptIds);

      if (progressResult.error) {
        setError(progressResult.error.message);
        setLoading(false);
        return;
      }

      loadedProgress = progressResult.data ?? [];
    }

    setLanguage(languageResult.data ?? null);
    setUnits(loadedUnits);
    setConcepts(loadedConcepts);
    setProgressRows(loadedProgress);
    setLoading(false);
  }, [learningLanguageId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const courseProgress = useMemo(
    () => getCourseProgress(units, concepts, progressRows),
    [units, concepts, progressRows]
  );

  const nextUnit = useMemo(
    () => getNextUnit(units, concepts, progressRows),
    [units, concepts, progressRows]
  );

  const unitProgress = useCallback(
    (unitId) => getUnitProgress(unitId, concepts, progressRows),
    [concepts, progressRows]
  );

  return {
    language,
    units,
    concepts,
    progressRows,
    courseProgress,
    nextUnit,
    unitProgress,
    loading,
    error,
    reload: load,
  };
}
