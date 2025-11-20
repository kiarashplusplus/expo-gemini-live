import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { VoiceSessionProvider } from '@/providers/VoiceSessionProvider';
import { useVoiceStore } from '@/state/voiceStore';
import { PreJoinScreen } from '@/screens/PreJoinScreen';
import { SessionScreen } from '@/screens/SessionScreen';
import { ensureFetchErrorCaching } from '@/utils/fetchPolyfill';

ensureFetchErrorCaching();

const queryClient = new QueryClient();

const RootNavigator = () => {
  const status = useVoiceStore((state) => state.status);
  const inCall = status === 'connecting' || status === 'connected' || status === 'ready';
  return inCall ? <SessionScreen /> : <PreJoinScreen />;
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <VoiceSessionProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </VoiceSessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
