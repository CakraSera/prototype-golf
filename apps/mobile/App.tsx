import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>prototype-golf</Text>
      {health.state === 'loading' && <Text style={styles.muted}>checking api...</Text>}
      {health.state === 'ok' && <Text style={styles.ok}>api ok - {health.time}</Text>}
      {health.state === 'error' && <Text style={styles.error}>{health.message}</Text>}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  muted: {
    color: '#666',
  },
  ok: {
    color: '#1a7f37',
  },
  error: {
    color: '#b42318',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
