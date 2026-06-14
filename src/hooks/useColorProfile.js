import { useState, useRef, useCallback } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { COLOR_PROFILES, DEFAULT_PROFILE } from '../services/colorProfiles';
import { storageService } from '../services/storageService';

export function useColorProfile() {
  const [currentProfile, setCurrentProfile] = useState(DEFAULT_PROFILE);
  const [targetProfile, setTargetProfile] = useState(DEFAULT_PROFILE);
  const transitionProgress = useSharedValue(1);
  const fromMatrixRef = useRef(COLOR_PROFILES[DEFAULT_PROFILE].matrix);
  const toMatrixRef = useRef(COLOR_PROFILES[DEFAULT_PROFILE].matrix);

  const switchProfile = useCallback((profileName) => {
    if (!COLOR_PROFILES[profileName]) return;
    if (profileName === currentProfile) return;

    fromMatrixRef.current = COLOR_PROFILES[currentProfile].matrix;
    toMatrixRef.current = COLOR_PROFILES[profileName].matrix;

    transitionProgress.value = 0;
    transitionProgress.value = withTiming(1, { duration: 1000 });

    setCurrentProfile(profileName);
    setTargetProfile(profileName);
    storageService.saveLastProfile(profileName);
    storageService.saveLastAnalysis(profileName);
  }, [currentProfile, transitionProgress]);

  const getInterpolatedMatrix = useCallback((progress) => {
    const from = fromMatrixRef.current;
    const to = toMatrixRef.current;
    return from.map((val, i) => val + (to[i] - val) * progress);
  }, []);

  return {
    currentProfile,
    switchProfile,
    getInterpolatedMatrix,
    transitionProgress,
    profileInfo: COLOR_PROFILES[currentProfile],
  };
}
