import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { colors } from '../theme';

type ProfileAvatarProps = {
  size?: number;
};

export function ProfileAvatar({ size = 32 }: ProfileAvatarProps) {
  return (
    <View
      className="items-center justify-center rounded-full bg-primary"
      style={{ width: size, height: size }}
    >
      <SymbolView
        name={{ ios: 'person.fill', android: 'person', web: 'person' }}
        size={Math.round(size * 0.55)}
        tintColor={colors.foreground}
      />
    </View>
  );
}
