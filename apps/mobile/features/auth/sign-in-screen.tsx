import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthButton, AuthError, AuthField, AuthForm } from './form';
import { useSession } from './session';

export default function SignInScreen() {
  const { email: initialEmail } = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState(typeof initialEmail === 'string' ? initialEmail : '');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const { signIn } = useSession();
  const router = useRouter();

  async function submit() {
    if (submitting.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      await signIn({ email: normalizedEmail, password });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in. Please try again.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <AuthForm title="Welcome back" description="Sign in to practice with purpose and keep your progress private.">
      <View className="gap-4">
        <AuthField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" maxLength={254} editable={!pending} />
        <AuthField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" maxLength={128} editable={!pending} returnKeyType="go" onSubmitEditing={() => void submit()} />
        <AuthError message={error} />
        <AuthButton label={pending ? 'Signing in…' : 'Sign in'} pending={pending} onPress={() => void submit()} />
      </View>
      <Pressable accessibilityRole="link" disabled={pending} accessibilityState={{ disabled: pending }} onPress={() => router.replace('/register')} className="min-h-12 items-center justify-center py-3">
        <Text className="text-center text-base font-semibold text-foreground">New to Dial Golf? Create an account</Text>
      </Pressable>
    </AuthForm>
  );
}
