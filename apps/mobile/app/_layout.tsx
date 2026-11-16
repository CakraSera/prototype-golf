import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { NotificationsButton, ProfileButton } from '../components/header-buttons';
import { colors } from '../theme';
import '../global.css';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { color: colors.foreground },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            title: '',
            headerLeft: () => <ProfileButton />,
            headerRight: () => <NotificationsButton />,
          }}
        />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
