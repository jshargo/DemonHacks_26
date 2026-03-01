import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { DiscoverItem } from '@/lib/types';
import { PLACE_CATEGORIES, ENTITY_TYPES } from '@/lib/constants';
import SaveButton from '@/components/collections/SaveButton';

interface DiscoverCardProps {
  item: DiscoverItem;
  onPress: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  isHighlighted?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

/** Format event date for display */
function formatEventDate(startsAt: string): string {
  const d = new Date(startsAt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Get badge color for this item */
function getBadgeColor(item: DiscoverItem): string {
  if (item.entityType === 'event') return ENTITY_TYPES.event.color;
  if (item.category && item.category in PLACE_CATEGORIES) {
    return PLACE_CATEGORIES[item.category].color;
  }
  return ENTITY_TYPES.place.color;
}

/** Get badge label for this item */
function getBadgeLabel(item: DiscoverItem): string {
  if (item.entityType === 'event') return item.subcategory ?? 'Event';
  if (item.category && item.category in PLACE_CATEGORIES) {
    return PLACE_CATEGORIES[item.category].label;
  }
  return 'Place';
}

export default function DiscoverCard({
  item,
  onPress,
  onHover,
  onHoverEnd,
  isHighlighted,
  isSaved,
  onToggleSave,
}: DiscoverCardProps) {
  const badgeColor = getBadgeColor(item);
  const badgeLabel = getBadgeLabel(item);

  return (
    <Pressable
      style={[styles.card, isHighlighted && styles.cardHighlighted]}
      onPress={onPress}
      onHoverIn={onHover}
      onHoverOut={onHoverEnd}
    >
      {/* Image Placeholder */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder} />

        {/* Category Badge */}
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>

        {/* Save Button */}
        {onToggleSave && (
          <View style={styles.saveContainer}>
            <SaveButton isSaved={isSaved ?? false} onToggle={onToggleSave} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title + Rating */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Subtitle — show formatted address for Mapbox items, subcategory+neighborhood otherwise */}
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.placeFormatted || [item.subcategory, item.neighborhood].filter(Boolean).join(' · ')}
        </Text>

        {/* Event date or price range */}
        {item.entityType === 'event' && item.startsAt && (
          <Text style={styles.meta}>{formatEventDate(item.startsAt)}</Text>
        )}
        {item.entityType === 'place' && item.priceRange && (
          <Text style={styles.meta}>{item.priceRange}</Text>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardHighlighted: {
    borderColor: '#1a1a2e',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 3 / 2,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#e8e8e8',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  saveContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  content: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingStar: {
    fontSize: 13,
    color: '#1a1a2e',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: '#555',
  },
});
