import { View } from 'react-native';
import { SubcategoryChip } from './SubcategoryChip';

interface ChipGroupProps {
  options: string[];
  selected: string[];
  onToggle: (label: string) => void;
}

const COLS = 3;

export function ChipGroup({ options, selected, onToggle }: ChipGroupProps) {
  const rows: string[][] = [];
  for (let i = 0; i < options.length; i += COLS) {
    rows.push(options.slice(i, i + COLS));
  }

  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', marginHorizontal: -4 }}>
          {row.map((opt) => (
            <SubcategoryChip
              key={opt}
              label={opt}
              selected={selected.includes(opt)}
              onPress={() => onToggle(opt)}
              style={{ flex: 1 }}
            />
          ))}
          {Array.from({ length: COLS - row.length }).map((_, i) => (
            <View key={`sp-${i}`} style={{ flex: 1, margin: 4 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
