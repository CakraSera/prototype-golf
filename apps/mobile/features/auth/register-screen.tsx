import { MIN_REGISTRATION_PASSWORD_LENGTH } from '@golf/shared';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthButton, AuthError, AuthField, AuthForm } from './form';
import { AccountCreatedError, useSession } from './session';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const { register } = useSession();
  const router = useRouter();

  async function submit() {
    if (submitting.current || accountCreated) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      setError('Choose a username.');
      return;
    }
    if (password.length < MIN_REGISTRATION_PASSWORD_LENGTH) {
      setError(`Use a password with at least ${MIN_REGISTRATION_PASSWORD_LENGTH} characters.`);
      return;
    }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      await register({ email: normalizedEmail, username: normalizedUsername, password });
    } catch (cause) {
      if (cause instanceof AccountCreatedError) {
        setAccountCreated(true);
        setPassword('');
      }
      setError(cause instanceof Error ? cause.message : 'Could not create your account. Please try again.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const passwordAction = passwordVisible ? 'Hide' : 'Show';

  return (
    <AuthForm title={accountCreated ? 'Account created' : 'Make practice count'} description={accountCreated ? 'Your account is ready. Continue to sign in using your new email and password.' : 'Create your Dial Golf account to save your practice and see your progress.'}>
      {accountCreated ? (
        <View className="gap-4">
          <AuthError message={error} />
          <AuthButton label="Continue to sign in" onPress={() => router.replace({ pathname: '/sign-in', params: { email: email.trim().toLowerCase() } })} />
        </View>
      ) : (
        <>
          <View className="gap-4">
            <AuthField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" maxLength={254} editable={!pending} />
            <AuthField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username-new" textContentType="username" maxLength={32} editable={!pending} />
            <AuthField
              label="Password"
              hint={`Use at least ${MIN_REGISTRATION_PASSWORD_LENGTH} characters (up to 128).`}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={128}
              editable={!pending}
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              trailingAction={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${passwordAction} password`}
                  onPress={() => setPasswordVisible(visible => !visible)}
                  className="min-w-12 items-center justify-center px-3 active:opacity-70"
                >
                  <Text className="text-sm font-semibold text-foreground">{passwordAction}</Text>
                </Pressable>
              }
            />
            <AuthError message={error} />
            <AuthButton label={pending ? 'Creating account…' : 'Create account'} pending={pending} onPress={() => void submit()} />
          </View>
          <Pressable accessibilityRole="link" disabled={pending} accessibilityState={{ disabled: pending }} onPress={() => router.replace('/sign-in')} className="min-h-12 items-center justify-center py-3">
            <Text className="text-center text-base font-semibold text-foreground">Already have an account? Sign in</Text>
          </Pressable>
        </>
      )}
    </AuthForm>
  );
}
