import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface AudioMeterProps {
  value: number;
  label: string;
}

export const AudioMeter = ({ value, label }: AudioMeterProps) => {
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.level, { width: `${clamped * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  track: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  level: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
});
