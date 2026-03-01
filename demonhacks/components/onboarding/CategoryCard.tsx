import { Pressable, Text, StyleSheet, View } from 'react-native';

interface CategoryCardProps {
  emoji: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}

export function CategoryCard({ emoji, label, selected, disabled, onPress }: CategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled && !selected}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        disabled && !selected && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, disabled && !selected && styles.labelDisabled]}>{label}</Text>
      {selected && <View style={styles.checkDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1,
    margin: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cardSelected: {
    borderColor: '#222222',
    borderWidth: 2,
    backgroundColor: '#F7F7F7',
  },
  cardDisabled: {
    opacity: 0.35,
  },
  cardPressed: {
    backgroundColor: '#F0F0F0',
  },
  emoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#222222',
    textAlign: 'center',
    lineHeight: 14,
  },
  labelDisabled: {
    color: '#B0B0B0',
  },
  checkDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#222222',
  },
});
