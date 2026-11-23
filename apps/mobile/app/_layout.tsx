import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { NotificationsButton, ProfileButton } from '../components/header-buttons';
import { SessionGate } from '../features/auth/session-gate';
import { SessionProvider, useSession } from '../features/auth/session';
import { colors } from '../theme';
import '../global.css';

function RootNavigator() {
  const { status, user } = useSession();
  return (
    <SessionGate>
      <Stack
        key={user?.id ?? 'signed-out'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { color: colors.foreground },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={status === 'signedIn'}>
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
          <Stack.Screen name="knowledge/[id]" options={{ title: 'Knowledge', headerBackTitle: 'All articles' }} />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </SessionGate>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </SessionProvider>
  );
}
