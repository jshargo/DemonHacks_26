// TODO: Heart/bookmark toggle button
// Owner: Person 4 (Collections + Saves)
// - Toggle save/unsave a spot
// - Filled heart when saved, outline when not
// - Opens AddToCollection modal on long press

import { Pressable, Text, StyleSheet } from 'react-native';

interface SaveButtonProps {
  isSaved: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
}

export default function SaveButton({ isSaved, onToggle, onLongPress }: SaveButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onToggle} onLongPress={onLongPress}>
      <Text style={styles.icon}>{isSaved ? '\u2665' : '\u2661'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 8 },
  icon: { fontSize: 24 },
});
