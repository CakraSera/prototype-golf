import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme';

export function AuthForm({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32, paddingHorizontal: 24 }}
      >
        <View className="w-full max-w-md self-center gap-6">
          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Dial Golf</Text>
            <Text accessibilityRole="header" className="text-3xl font-bold text-foreground">{title}</Text>
            <Text className="text-base leading-6 text-muted-foreground">{description}</Text>
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthField({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        className="min-h-14 rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground"
      />
      {hint ? <Text className="text-sm text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text selectable accessibilityRole="alert" accessibilityLiveRegion="polite" className="text-sm leading-5 text-danger">{message}</Text>;
}

export function AuthButton({ label, pending = false, onPress }: { label: string; pending?: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: pending, busy: pending }}
      disabled={pending}
      onPress={onPress}
      className={`min-h-14 flex-row items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 ${pending ? 'opacity-60' : ''}`}
    >
      {pending ? <ActivityIndicator color={colors.foreground} /> : null}
      <Text className="text-base font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}
