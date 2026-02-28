import { StyleSheet, View } from 'react-native';

import { useMapStore } from '@/stores/map-store';
import { useMapPins } from '@/hooks/useMapPins';
import CategoryChips from '@/components/spots/CategoryChips';
import MapViewComponent from '@/components/map/MapView';

export default function MapScreen() {
  const {
    activeFilters,
    activePlaceCategories,
    toggleFilter,
    togglePlaceCategory,
    selectPin,
  } = useMapStore();

  const { pins, loading } = useMapPins({
    entityTypes: activeFilters,
    placeCategories: activePlaceCategories,
  });

  return (
    <View style={styles.container}>
      <View style={styles.chipsOverlay}>
        <CategoryChips
          activeCategories={activeFilters}
          activePlaceCategories={activePlaceCategories}
          onToggle={toggleFilter}
          onTogglePlaceCategory={togglePlaceCategory}
        />
      </View>
      <MapViewComponent
        pins={pins}
        loading={loading}
        onPinPress={selectPin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chipsOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
