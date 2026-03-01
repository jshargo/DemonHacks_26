import { View, StyleSheet } from 'react-native';
import SearchBar from './SearchBar';
import CategoryStrip from './CategoryStrip';
import { Wordmark } from '@/components/ui/Wordmark';
import { colors, spacing } from '@/lib/theme';

interface TopBarProps {
  showWordmark?: boolean;
}

export default function TopBar({ showWordmark }: TopBarProps) {
  return (
    <View style={styles.container}>
      {showWordmark && (
        <View style={styles.wordmarkRow}>
          <Wordmark size={22} />
        </View>
      )}
      <SearchBar />
      <CategoryStrip />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  wordmarkRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
});
