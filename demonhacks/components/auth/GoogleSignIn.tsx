import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface GoogleSignInProps {
  onPress: () => void;
}

export default function GoogleSignIn({ onPress }: GoogleSignInProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radii.md,
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceHover,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
