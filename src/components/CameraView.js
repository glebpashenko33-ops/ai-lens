import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  SafeAreaView, Dimensions,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { useCamera } from '../hooks/useCamera';
import { useColorProfile } from '../hooks/useColorProfile';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import RecordButton from './RecordButton';
import ProfileIndicator from './ProfileIndicator';
import ProgressBar from './ProgressBar';
import SettingsModal from './SettingsModal';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const {
    facing, toggleFacing, isRecording,
    startRecording, stopRecording,
    cameraRef, permission, requestAll,
    takeSnapshot, savedToast,
  } = useCamera();

  const { currentProfile, switchProfile, profileInfo } = useColorProfile();
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { isAnalyzing, progress, startCycle, stopCycle, checkBrightness, updateApiKey } =
    useAIAnalysis(switchProfile);

  const cameraReadyRef = useRef(false);

  const getSnapshot = useCallback(async () => {
    if (!cameraReadyRef.current) return null;
    return takeSnapshot();
  }, [takeSnapshot]);

  useEffect(() => {
    if (permission?.granted) {
      startCycle(getSnapshot);
      return () => stopCycle();
    }
  }, [permission?.granted, facing]);

  if (!permission) {
    return <View style={styles.black} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionText}>Нужен доступ к камере</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestAll}>
          <Text style={styles.permissionBtnText}>Дать доступ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCameraFlip = () => {
    toggleFacing();
  };

  // Build color matrix for Camera filter
  // expo-camera doesn't support ColorMatrix directly, so we apply profile visually
  // The ColorMatrix is described but Camera component in expo doesn't have direct filter support
  // We display it as overlay information

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        type={facing === 'back' ? CameraType.back : CameraType.front}
        onCameraReady={() => { cameraReadyRef.current = true; }}
        videoQuality={Camera.Constants?.VideoQuality?.['2160p']}
      />

      {/* LUT overlay using tintColor approximation via colored overlay */}
      <View style={[styles.lutOverlay, getLutStyle(currentProfile)]} pointerEvents="none" />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.topRow}>
          {/* AI indicator */}
          <View style={styles.aiIndicatorWrap}>
            <View style={[styles.aiDot, isAnalyzing ? styles.aiDotActive : styles.aiDotIdle]} />
          </View>

          {/* Title */}
          <Text style={styles.title}>AI Lens</Text>

          {/* Settings */}
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsVisible(true)}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom controls */}
      <View style={styles.bottomContainer}>
        <ProgressBar progress={progress} />

        <View style={styles.controlsRow}>
          {/* Profile indicator (left) */}
          <View style={styles.sideControl}>
            <ProfileIndicator profileName={currentProfile} />
          </View>

          {/* Record button (center) */}
          <RecordButton isRecording={isRecording} onPress={handleRecord} />

          {/* Flip camera (right) */}
          <View style={styles.sideControl}>
            <TouchableOpacity onPress={handleCameraFlip} style={styles.flipBtn}>
              <Text style={styles.flipIcon}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Toast */}
      {savedToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ Видео сохранено</Text>
        </View>
      )}

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onApiKeyChange={updateApiKey}
      />
    </View>
  );
}

// Generate a subtle tint based on the profile to simulate LUT
function getLutStyle(profileName) {
  const tints = {
    'Дневной': 'rgba(0,0,0,0)',
    'Золотой час': 'rgba(255,140,0,0.08)',
    'Пасмурно': 'rgba(100,130,200,0.08)',
    'Ночной': 'rgba(255,100,50,0.07)',
    'Портрет': 'rgba(255,200,180,0.05)',
    'Кино': 'rgba(0,0,80,0.1)',
    'Помещение': 'rgba(0,50,100,0.07)',
  };
  return { backgroundColor: tints[profileName] || 'rgba(0,0,0,0)' };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  black: {
    flex: 1,
    backgroundColor: '#000',
  },
  lutOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  aiIndicatorWrap: {
    width: 40,
    alignItems: 'flex-start',
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  aiDotActive: {
    backgroundColor: '#30d158',
  },
  aiDotIdle: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '200',
    letterSpacing: 1,
  },
  settingsBtn: {
    width: 40,
    alignItems: 'flex-end',
  },
  settingsIcon: {
    fontSize: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  sideControl: {
    width: 80,
    alignItems: 'center',
  },
  flipBtn: {
    padding: 10,
  },
  flipIcon: {
    fontSize: 26,
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '300',
  },
  permissionBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 30,
    paddingVertical: 14,
  },
  permissionBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
