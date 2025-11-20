import { useCallback, useState } from 'react';

import { Camera } from 'expo-camera';

export type PermissionState = 'unknown' | 'granted' | 'blocked';

export const useDevicePermissions = () => {
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('unknown');
  const [micPermission, setMicPermission] = useState<PermissionState>('unknown');

  const requestPermissions = useCallback(async () => {
    const [cameraResult, micResult] = await Promise.all([
      Camera.requestCameraPermissionsAsync(),
      Camera.requestMicrophonePermissionsAsync(),
    ]);

    setCameraPermission(cameraResult.status === 'granted' ? 'granted' : 'blocked');
    setMicPermission(micResult.status === 'granted' ? 'granted' : 'blocked');

    return cameraResult.status === 'granted' && micResult.status === 'granted';
  }, []);

  const hasPermissions = cameraPermission === 'granted' && micPermission === 'granted';

  return {
    cameraPermission,
    micPermission,
    hasPermissions,
    requestPermissions,
  } as const;
};
