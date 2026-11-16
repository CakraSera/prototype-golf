import { Tabs } from 'expo-router/tabs';
import { SymbolView } from 'expo-symbols';

import { colors } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
