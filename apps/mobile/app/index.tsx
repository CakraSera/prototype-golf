import { createApiClient } from '@golf/shared';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000');

type Health =
  | { state: 'loading' }
  | { state: 'ok'; time: string }
  | { state: 'error'; message: string };

export default function TodayScreen() {
  const [health, setHealth] = useState<Health>({ state: 'loading' });

  useEffect(() => {
    api.health().then(
      ({ time }) => setHealth({ state: 'ok', time }),
      (error: unknown) => setHealth({ state: 'error', message: String(error) }),
    );
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-6">
      <View className="items-center gap-3">
        <Text className="text-xl font-semibold text-foreground">prototype-golf</Text>
        <View className="h-1.5 w-12 rounded-full bg-primary" />
      </View>

      <View className="w-full max-w-sm rounded-2xl border border-border bg-surface px-5 py-4">
        {health.state === 'loading' && (
          <Text className="text-center text-sm text-muted-foreground">checking api...</Text>
        )}
        {health.state === 'ok' && (
          <Text className="text-center text-sm text-success">api ok - {health.time}</Text>
        )}
        {health.state === 'error' && (
          <Text className="text-center text-sm text-danger">{health.message}</Text>
        )}
      </View>
    </View>
  );
}
