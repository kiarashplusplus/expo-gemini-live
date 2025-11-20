import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AudioMeter } from '@/components/AudioMeter';
import { StatusBadge } from '@/components/StatusBadge';
import { TranscriptList } from '@/components/TranscriptList';
import { useVoiceSession } from '@/providers/VoiceSessionProvider';
import { useVoiceStore } from '@/state/voiceStore';
import { colors } from '@/theme/colors';
import { VoiceClientVideoView } from '@pipecat-ai/react-native-daily-transport';
import { MediaStreamTrack as DailyMediaTrack } from '@daily-co/react-native-webrtc';

export const SessionScreen = () => {
  const { connect, disconnect, sendText, tracks, clientState } = useVoiceSession();
  const status = useVoiceStore((state) => state.status);
  const botReady = useVoiceStore((state) => state.botReady);
  const localLevel = useVoiceStore((state) => state.localLevel);
  const remoteLevel = useVoiceStore((state) => state.remoteLevel);
  const transcripts = useVoiceStore((state) => state.transcripts);
  const [message, setMessage] = useState('');
  const [restartPending, setRestartPending] = useState(false);

  const disabled = status === 'connecting';

  const remoteVideoTrack = tracks?.bot?.video
    ? (tracks.bot.video as unknown as DailyMediaTrack)
    : null;
  const remoteAudioTrack = tracks?.bot?.audio
    ? (tracks.bot.audio as unknown as DailyMediaTrack)
    : null;
  const localVideoTrack = tracks?.local?.video
    ? (tracks.local.video as unknown as DailyMediaTrack)
    : null;

  const handleSend = async () => {
    if (!message.trim()) {
      return;
    }
    await sendText(message.trim());
    setMessage('');
  };

  const handleRestart = async () => {
    if (restartPending) {
      return;
    }
    setRestartPending(true);
    try {
      await disconnect();
      await connect();
    } finally {
      setRestartPending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoGrid}>
        <View style={styles.videoCard}>
          <VoiceClientVideoView videoTrack={remoteVideoTrack} audioTrack={remoteAudioTrack} style={styles.video} />
          {!remoteVideoTrack && <Text style={styles.videoPlaceholder}>Waiting for Gemini video…</Text>}
          <View style={styles.videoOverlay}>
            <StatusBadge status={status} />
            <Text style={styles.readyText}>{botReady ? 'Gemini is ready' : 'Waiting for bot…'}</Text>
          </View>
        </View>

        <View style={styles.videoCard}>
          <VoiceClientVideoView videoTrack={localVideoTrack} audioTrack={null} style={styles.video} />
          {!localVideoTrack && <Text style={styles.videoPlaceholder}>Camera initializing…</Text>}
          <View style={styles.videoOverlay}>
            <Text style={styles.previewLabel}>Your preview</Text>
            <Text style={styles.stateLabel}>Transport: {clientState ?? 'unknown'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metersRow}>
        <AudioMeter value={localLevel} label="You" />
        <AudioMeter value={remoteLevel} label="Gemini" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live transcript</Text>
        <TranscriptList transcripts={transcripts} />
      </View>

      <View style={styles.actions}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Send a text prompt"
          placeholderTextColor={colors.muted}
          style={styles.textInput}
          editable={!disabled}
        />
        <Pressable style={[styles.sendButton, disabled && styles.disabled]} onPress={handleSend} disabled={disabled}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>

      <View style={styles.bottomActions}>
        <Pressable
          style={[styles.restartButton, (disabled || restartPending) && styles.disabled]}
          onPress={handleRestart}
          disabled={disabled || restartPending}
        >
          <Text style={styles.restartText}>{restartPending ? 'Restarting…' : 'Restart Session'}</Text>
        </Pressable>
        <Pressable style={styles.hangupButton} onPress={disconnect}>
          <Text style={styles.hangupText}>Hang Up</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    gap: 16,
  },
  videoGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  videoCard: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    height: 220,
    flex: 1,
    minWidth: 180,
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    position: 'absolute',
    top: '45%',
    left: 16,
    right: 16,
    textAlign: 'center',
    color: colors.muted,
  },
  videoOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readyText: {
    color: colors.text,
    fontWeight: '600',
  },
  previewLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  stateLabel: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  metersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendText: {
    color: '#081229',
    fontWeight: '700',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
  },
  restartButton: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexBasis: 150,
  },
  restartText: {
    color: colors.text,
    fontWeight: '600',
  },
  hangupButton: {
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    flex: 1,
  },
  hangupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
