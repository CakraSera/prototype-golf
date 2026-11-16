import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ProfileAvatar } from '../components/profile-avatar';

export default function ProfileScreen() {
  const [notice, setNotice] = useState<string | null>(null);

  function handleLogOut() {
    setNotice('Accounts are not connected in this prototype yet.');
  }

  return (
    <View className="flex-1 bg-background px-6 pb-8 pt-8">
      <View className="items-center gap-4">
        <ProfileAvatar size={80} />
        <View className="items-center gap-1">
          <Text className="text-lg font-semibold text-foreground">Guest golfer</Text>
          <Text className="text-sm text-muted-foreground">You are browsing as a guest.</Text>
        </View>
      </View>

      <View className="mt-auto">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          className="items-center rounded-2xl border border-border bg-surface py-4"
          onPress={handleLogOut}
        >
          <Text className="text-base font-semibold text-danger">Log out</Text>
        </Pressable>
        {notice ? (
          <Text className="mt-3 text-center text-sm text-muted-foreground">{notice}</Text>
        ) : null}
      </View>
    </View>
  );
}
