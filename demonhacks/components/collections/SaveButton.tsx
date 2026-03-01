// Heart/bookmark toggle button
// Owner: Person 4 (Collections + Saves)
// - Toggle save/unsave a spot
// - Filled heart when saved, outline when not
// - Opens AddToCollection modal on long press

import { Pressable, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors, spacing } from '@/lib/theme';

interface SaveButtonProps {
  isSaved: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
}

export default function SaveButton({ isSaved, onToggle, onLongPress }: SaveButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onToggle} onLongPress={onLongPress}>
      {isSaved ? (
        <Heart size={20} color={colors.error} fill={colors.error} />
      ) : (
        <Heart size={20} color={colors.textPrimary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.sm,
  },
});
