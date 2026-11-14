import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { createApiClient } from '@golf/shared';

const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000');

type Health =
  | { state: 'loading' }
  | { state: 'ok'; time: string }
  | { state: 'error'; message: string };

export default function App() {
  const [health, setHealth] = useState<Health>({ state: 'loading' });

  useEffect(() => {
    api.health().then(
      ({ time }) => setHealth({ state: 'ok', time }),
      (error: unknown) => setHealth({ state: 'error', message: String(error) }),
    );
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-white px-6">
      <Text className="text-xl font-semibold text-neutral-900">prototype-golf</Text>
      {health.state === 'loading' && <Text className="text-neutral-500">checking api...</Text>}
      {health.state === 'ok' && <Text className="text-green-700">api ok - {health.time}</Text>}
      {health.state === 'error' && (
        <Text className="text-center text-red-700">{health.message}</Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}
