import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { VoiceStatus } from '@/state/voiceStore';

const statusColors: Record<VoiceStatus, string> = {
  idle: colors.muted,
  connecting: colors.accent,
  connected: colors.success,
  ready: colors.accentMuted,
  error: colors.danger,
};

const statusLabels: Record<VoiceStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting…',
  connected: 'Connected',
  ready: 'Ready',
  error: 'Error',
};

export const StatusBadge = ({ status }: { status: VoiceStatus }) => {
  return (
    <View style={[styles.container, { backgroundColor: statusColors[status] }]}> 
      <Text style={styles.text}>{statusLabels[status]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  text: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
});
