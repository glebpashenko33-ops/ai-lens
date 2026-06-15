import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function ProgressBar({ progress }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: '100%',
  },
  fill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
