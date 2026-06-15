import { useState, useRef, useCallback } from 'react';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export function useCamera() {
  const [facing, setFacing] = useState('back');
  const [isRecording, setIsRecording] = useState(false);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [audioPermission, requestAudioPermission] = Camera.useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef(null);
  const [savedToast, setSavedToast] = useState(false);

  const toggleFacing = useCallback(() => {
    setFacing(f => f === 'back' ? 'front' : 'back');
  }, []);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;
    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        quality: Camera.Constants?.VideoQuality?.['2160p'] || '2160p',
      });
      // Save to gallery
      if (mediaPermission?.granted && video?.uri) {
        await MediaLibrary.saveToLibraryAsync(video.uri);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      }
    } catch {
      setIsRecording(false);
    }
  }, [isRecording, mediaPermission]);

  const stopRecording = useCallback(() => {
    if (!cameraRef.current || !isRecording) return;
    cameraRef.current.stopRecording();
    setIsRecording(false);
  }, [isRecording]);

  const takeSnapshot = useCallback(async () => {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.1,
        skipProcessing: true,
        width: 320,
      });
      return photo?.base64 || null;
    } catch {
      return null;
    }
  }, []);

  const requestAll = useCallback(async () => {
    await requestPermission();
    await requestAudioPermission();
    await requestMediaPermission();
  }, [requestPermission, requestAudioPermission, requestMediaPermission]);

  return {
    facing,
    toggleFacing,
    isRecording,
    startRecording,
    stopRecording,
    cameraRef,
    permission,
    audioPermission,
    requestAll,
    takeSnapshot,
    savedToast,
  };
}
