import React, { useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useVoiceSession } from '@/providers/VoiceSessionProvider';
import { useVoiceStore } from '@/state/voiceStore';
import { colors } from '@/theme/colors';
import { useDevicePermissions } from '@/hooks/useDevicePermissions';
import { StatusBadge } from '@/components/StatusBadge';

export const PreJoinScreen = () => {
  const { connect } = useVoiceSession();
  const form = useVoiceStore((state) => state.form);
  const status = useVoiceStore((state) => state.status);
  const error = useVoiceStore((state) => state.error);
  const updateForm = useVoiceStore((state) => state.updateForm);
  const { hasPermissions, requestPermissions } = useDevicePermissions();

  const handleConnect = useCallback(async () => {
    const granted = await requestPermissions();
    if (!granted) {
      return;
    }
    await connect();
  }, [connect, requestPermissions]);

  const disabled = status === 'connecting';

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.wrapper}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Pipecat Gemini Live</Text>
        <Text style={styles.subheading}>
          Set your backend URL, introduce yourself, and start a realtime conversation powered by Gemini Live.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Backend URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://your-api-host"
            placeholderTextColor={colors.muted}
            value={form.apiBaseUrl}
            onChangeText={(text) => updateForm({ apiBaseUrl: text })}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            placeholder="Alex"
            placeholderTextColor={colors.muted}
            value={form.displayName}
            onChangeText={(text) => updateForm({ displayName: text })}
          />

          <Text style={styles.label}>Prompt</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholder="System prompt or context notes"
            placeholderTextColor={colors.muted}
            value={form.prompt}
            onChangeText={(text) => updateForm({ prompt: text })}
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Create a Daily room</Text>
              <Text style={styles.helper}>Disable if you want to reuse an existing room URL.</Text>
            </View>
            <Switch
              value={form.createDailyRoom}
              onValueChange={(value) => updateForm({ createDailyRoom: value })}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </View>

        <View style={styles.statusRow}>
          <StatusBadge status={status} />
          <Text style={styles.helper}>{hasPermissions ? 'Permissions ready' : 'Camera + mic permissions required'}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.connectButton, disabled && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={disabled}
        >
          <Text style={styles.connectText}>{disabled ? 'Connecting…' : 'Start Conversation'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subheading: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  helper: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  connectButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectText: {
    color: '#081229',
    fontSize: 16,
    fontWeight: '700',
  },
});
