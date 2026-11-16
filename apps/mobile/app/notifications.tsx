import { SymbolView } from 'expo-symbols';
import { Text, View } from 'react-native';

import { colors } from '../theme';

export default function NotificationsScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <SymbolView
        name={{ ios: 'bell.slash', android: 'notifications_off', web: 'notifications_off' }}
        size={32}
        tintColor={colors.mutedForeground}
      />
      <Text className="text-base font-semibold text-foreground">No notifications yet</Text>
      <Text className="text-center text-sm text-muted-foreground">
        Practice reminders and updates will show up here.
      </Text>
    </View>
  );
}
