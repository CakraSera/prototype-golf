import type { Shot } from '@golf/shared';
import { Pressable, Text, View, type PressableProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme';
import type { Draft } from './provider';

export const fields = [
  { key: 'start', label: 'Start line', help: 'Which direction did the ball start relative to the target?', values: ['left', 'straight', 'right'] },
  { key: 'curve', label: 'Curve', help: 'Which way did the ball bend after it started?', values: ['left', 'straight', 'right'] },
  { key: 'height', label: 'Height', help: 'How high did the ball fly compared with your usual shot?', values: ['low', 'normal', 'high'] },
] as const;
export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export const describeShot = (shot: Shot) => `${capitalize(shot.start)} · ${capitalize(shot.curve)} · ${capitalize(shot.height)}`;

export function Action({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: PressableProps['onPress']; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    className={`min-h-12 items-center justify-center rounded-xl border px-5 py-4 ${secondary ? 'border-border bg-background' : 'border-primary bg-primary'} ${disabled ? 'opacity-50' : 'active:opacity-70'}`}>
    <Text className="text-center text-base font-semibold text-foreground">{label}</Text>
  </Pressable>;
}
export function Back({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} className={`min-h-11 self-start justify-center py-2 ${disabled ? 'opacity-50' : 'active:opacity-60'}`}>
    <Text className="text-sm text-muted-foreground">← {label}</Text>
  </Pressable>;
}
export function Heading({ children }: { children: string }) {
  return <Text accessibilityRole="header" className="text-3xl font-semibold tracking-tight text-foreground">{children}</Text>;
}
export function Notice({ children, error = false }: { children: string; error?: boolean }) {
  return <View className="rounded-xl border border-border px-4 py-3">
    <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" className={`text-sm leading-6 ${error ? 'text-danger' : 'text-success'}`}>{children}</Text>
  </View>;
}
export function Summary({ shot }: { shot: Draft }) {
  return <View className="flex-row flex-wrap rounded-xl border border-border px-3 py-3">
    {fields.map(field => <View key={field.key} className="min-w-24 flex-1 gap-1 px-1 py-1">
      <Text className="text-xs text-muted-foreground">{field.label}</Text>
      <Text className="text-sm font-semibold text-foreground">{shot[field.key] ? capitalize(shot[field.key]!) : '—'}</Text>
    </View>)}
  </View>;
}
export function ChoiceIcon({ field, value }: { field: keyof Shot; value: string }) {
  let path: string;
  if (field === 'height') {
    const peak = value === 'low' ? 10 : value === 'normal' ? 1 : -9;
    path = `M2 18Q11 ${peak} 22 18M2 21h20`;
  } else if (field === 'curve' && value !== 'straight') {
    path = value === 'left' ? 'M18 20v-4c0-6-5-8-12-8m4-4L6 8l4 4' : 'M6 20v-4c0-6 5-8 12-8m-4-4 4 4-4 4';
  } else {
    path = value === 'left' ? 'M17 19 6 6m0 6V6h6' : value === 'right' ? 'M7 19 18 6m0 6V6h-6' : 'M12 20V4m-5 5 5-5 5 5';
  }
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d={path} stroke={colors.foreground} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
