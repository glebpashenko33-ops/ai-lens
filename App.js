import React from 'react';
import { StatusBar } from 'expo-status-bar';
import CameraScreen from './src/components/CameraView';

export default function App() {
  return (
    <>
      <StatusBar style="light" hidden />
      <CameraScreen />
    </>
  );
}
