import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileAvatar } from '../components/profile-avatar';
import { AuthError } from '../features/auth/form';
import { useSession } from '../features/auth/session';
import { colors } from '../theme';

export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const insets = useSafeAreaInsets();

  async function handleLogOut() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      await signOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finish logging out. Please retry.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (!user) return null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: insets.bottom + 32 }}
    >
      <View className="items-center gap-4">
        <ProfileAvatar size={80} />
        <View className="items-center gap-1">
          <Text selectable className="text-center text-lg font-semibold text-foreground">{user.fullName}</Text>
          <Text selectable className="text-center text-sm text-muted-foreground">{user.email}</Text>
          <Text selectable className="text-center text-sm text-muted-foreground">@{user.username}</Text>
        </View>
      </View>

      <View className="mt-auto gap-3 pt-8">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          accessibilityState={{ disabled: pending, busy: pending }}
          disabled={pending}
          className={`min-h-14 flex-row items-center justify-center gap-3 rounded-2xl border border-border bg-surface py-4 ${pending ? 'opacity-60' : ''}`}
          onPress={() => void handleLogOut()}
        >
          {pending ? <ActivityIndicator color={colors.danger} /> : null}
          <Text className="text-base font-semibold text-danger">{pending ? 'Logging out…' : 'Log out'}</Text>
        </Pressable>
        <AuthError message={error} />
      </View>
    </ScrollView>
  );
}
