import { useState, useCallback } from 'react';
import { geminiAPI } from '../services/geminiApi';

/**
 * useGeminiAnalysis
 * Manages the full lifecycle of a Gemini AI analysis request.
 *
 * Returns:
 *   analyze()    — trigger function (call on button click)
 *   data         — { stats, insights, isEmpty, analysedAt } | null
 *   loading      — boolean
 *   error        — string | null
 *   hasAnalysed  — boolean (true after first successful analysis)
 */
export const useGeminiAnalysis = () => {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [hasAnalysed, setHasAnalysed] = useState(false);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res    = await geminiAPI.analyze();
      const result = res.data.data;

      setData(result);
      setHasAnalysed(true);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'AI analysis failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setHasAnalysed(false);
  }, []);

  return { analyze, data, loading, error, hasAnalysed, reset };
};
