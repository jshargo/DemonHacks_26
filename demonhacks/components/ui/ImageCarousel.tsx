import { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
  type ViewToken,
  type ListRenderItemInfo,
  type LayoutChangeEvent,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface ImageCarouselProps {
  imageUrl: string | null;
  photoUrls: string[];
}

export default function ImageCarousel({ imageUrl, photoUrls }: ImageCarouselProps) {
  const urls =
    photoUrls.length > 0
      ? photoUrls
      : imageUrl
        ? [imageUrl]
        : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const flatListRef = useRef<FlatList<string>>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDimensions({ width, height });
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= urls.length) return;
      flatListRef.current?.scrollToIndex({ index, animated: true });
    },
    [urls.length],
  );

  const { width: cw, height: ch } = dimensions;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <Image
        source={{ uri: item }}
        style={{ width: cw, height: ch }}
        resizeMode="cover"
      />
    ),
    [cw, ch],
  );

  const keyExtractor = useCallback((_: string, index: number) => String(index), []);

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: cw,
      offset: cw * index,
      index,
    }),
    [cw],
  );

  if (urls.length === 0) {
    return <View style={styles.placeholder} />;
  }

  if (urls.length === 1) {
    return (
      <View style={styles.container} onLayout={onLayout}>
        {cw > 0 && ch > 0 && (
          <Image
            source={{ uri: urls[0] }}
            style={{ width: cw, height: ch }}
            resizeMode="cover"
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {cw > 0 && ch > 0 && (
        <FlatList
          ref={flatListRef}
          data={urls}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          style={{ width: cw, height: ch }}
        />
      )}

      {/* Left arrow */}
      {activeIndex > 0 && (
        <Pressable
          style={[styles.arrow, styles.arrowLeft]}
          onPress={() => scrollToIndex(activeIndex - 1)}
        >
          <ChevronLeft size={20} color={colors.white} />
        </Pressable>
      )}

      {/* Right arrow */}
      {activeIndex < urls.length - 1 && (
        <Pressable
          style={[styles.arrow, styles.arrowRight]}
          onPress={() => scrollToIndex(activeIndex + 1)}
        >
          <ChevronRight size={20} color={colors.white} />
        </Pressable>
      )}

      {/* Counter pill */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {activeIndex + 1} / {urls.length}
        </Text>
      </View>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {urls.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  singleImage: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  arrow: {
    position: 'absolute',
    top: '50%' as unknown as number,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: {
    left: spacing.sm,
  },
  arrowRight: {
    right: spacing.sm,
  },
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  counterText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.white,
    borderRadius: 9,
  },
});
