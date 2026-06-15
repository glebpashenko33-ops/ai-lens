import { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeFrame } from '../services/aiService';
import { storageService } from '../services/storageService';

const AI_INTERVAL = 30000; // 30 seconds
const BRIGHTNESS_THRESHOLD = 0.30; // 30%

export function useAIAnalysis(onProfileChange) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);
  const [progress, setProgress] = useState(0);
  const lastBrightnessRef = useRef(null);
  const apiKeyRef = useRef(null);
  const timerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const analysisStartRef = useRef(null);

  useEffect(() => {
    storageService.getApiKey().then(k => { apiKeyRef.current = k; });
    return () => {
      clearInterval(timerRef.current);
      clearInterval(progressTimerRef.current);
    };
  }, []);

  const runAnalysis = useCallback(async (getSnapshot) => {
    if (!apiKeyRef.current || !getSnapshot) return;

    setIsAnalyzing(true);
    try {
      const base64 = await getSnapshot();
      if (!base64) return;

      const profile = await analyzeFrame(base64, apiKeyRef.current);
      if (profile) {
        onProfileChange(profile);
        setLastAnalysisTime(Date.now());
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [onProfileChange]);

  const startCycle = useCallback((getSnapshot) => {
    analysisStartRef.current = Date.now();

    // Run immediately
    runAnalysis(getSnapshot);

    // Progress bar update
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - analysisStartRef.current;
      setProgress(Math.min(elapsed / AI_INTERVAL, 1));
    }, 300);

    // Periodic AI analysis
    timerRef.current = setInterval(() => {
      analysisStartRef.current = Date.now();
      setProgress(0);
      runAnalysis(getSnapshot);
    }, AI_INTERVAL);
  }, [runAnalysis]);

  const stopCycle = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(progressTimerRef.current);
    setProgress(0);
  }, []);

  const checkBrightness = useCallback((brightness, getSnapshot) => {
    if (lastBrightnessRef.current === null) {
      lastBrightnessRef.current = brightness;
      return;
    }
    const delta = Math.abs(brightness - lastBrightnessRef.current) / (lastBrightnessRef.current || 1);
    if (delta > BRIGHTNESS_THRESHOLD) {
      lastBrightnessRef.current = brightness;
      runAnalysis(getSnapshot);
    }
  }, [runAnalysis]);

  const updateApiKey = useCallback((key) => {
    apiKeyRef.current = key;
  }, []);

  return {
    isAnalyzing,
    lastAnalysisTime,
    progress,
    startCycle,
    stopCycle,
    checkBrightness,
    updateApiKey,
  };
}
