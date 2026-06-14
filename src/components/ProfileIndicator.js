import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_PROFILES } from '../services/colorProfiles';

export default function ProfileIndicator({ profileName }) {
  const profile = COLOR_PROFILES[profileName];
  if (!profile) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{profile.icon}</Text>
      <Text style={styles.name}>{profile.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 14,
  },
  name: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '300',
  },
});
