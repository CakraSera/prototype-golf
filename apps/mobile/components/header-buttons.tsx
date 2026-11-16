import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { colors } from '../theme';
import { ProfileAvatar } from './profile-avatar';

export function ProfileButton() {
  return (
    <Link href="/profile" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile settings"
        hitSlop={8}
      >
        <ProfileAvatar />
      </Pressable>
    </Link>
  );
}

export function NotificationsButton() {
  return (
    <Link href="/notifications" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open notifications"
        className="p-1"
        hitSlop={8}
      >
        <SymbolView
          name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
          size={22}
          tintColor={colors.foreground}
        />
      </Pressable>
    </Link>
  );
}
