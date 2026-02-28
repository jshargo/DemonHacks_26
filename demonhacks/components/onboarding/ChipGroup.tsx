import { View } from 'react-native';
import { SubcategoryChip } from './SubcategoryChip';

interface ChipGroupProps {
  options: string[];
  selected: string[];
  onToggle: (label: string) => void;
}

export function ChipGroup({ options, selected, onToggle }: ChipGroupProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
      {options.map((opt) => (
        <SubcategoryChip
          key={opt}
          label={opt}
          selected={selected.includes(opt)}
          onPress={() => onToggle(opt)}
        />
      ))}
    </View>
  );
}
