import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '../../theme';
import { AuthButton, AuthError, AuthForm } from './form';
import { useSession } from './session';

export function SessionGate({ children }: { children: ReactNode }) {
  const { status, error, accessToken, restore, signOut } = useSession();
  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <ActivityIndicator size="large" color={colors.foreground} accessibilityLabel="Loading session" />
        <Text accessibilityLiveRegion="polite" className="text-center text-base text-foreground">Securing your session…</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <AuthForm title="Let's reconnect" description="Your private practice stays locked until your session is ready.">
        <AuthError message={error} />
        <AuthButton label="Retry" onPress={() => void restore()} />
        {accessToken ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              // signOut reports deletion failures through this same gate.
              void signOut().catch(() => undefined);
            }}
            className="min-h-12 items-center justify-center py-3"
          >
            <Text className="text-base font-semibold text-danger">Log out instead</Text>
          </Pressable>
        ) : null}
      </AuthForm>
    );
  }
  return children;
}
