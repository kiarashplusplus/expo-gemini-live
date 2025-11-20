import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { TranscriptMessage } from '@/types/rtvi';

interface TranscriptListProps {
  transcripts: TranscriptMessage[];
}

export const TranscriptList = ({ transcripts }: TranscriptListProps) => {
  const orderedTranscripts = useMemo(
    () => [...transcripts].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [transcripts],
  );

  if (!transcripts.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No conversation yet. Say hello!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={orderedTranscripts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={[styles.message, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
          <Text style={styles.messageLabel}>{item.role === 'user' ? 'You' : 'Gemini'}</Text>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      )}
      style={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
    maxHeight: 220,
  },
  message: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    alignSelf: 'flex-end',
  },
  botBubble: {
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
    alignSelf: 'flex-start',
  },
  messageLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  messageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  emptyState: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.muted,
  },
});
