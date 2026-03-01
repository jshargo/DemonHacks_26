import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography } from '@/lib/theme';

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spot Detail</Text>
      <Text style={styles.id}>Spot ID: {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.displaySm, color: colors.textPrimary },
  id: { ...typography.bodyMd, color: colors.textSecondary, marginTop: spacing.xs },
});
