import { Pressable, Text, StyleSheet } from 'react-native';

interface SubcategoryChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: object;
}

export function SubcategoryChip({ label, selected, onPress, style }: SubcategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
        style,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    margin: 4,
  },
  chipSelected: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  chipPressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#222222',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
