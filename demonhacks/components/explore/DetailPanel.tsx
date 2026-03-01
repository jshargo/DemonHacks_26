import { View, Text, Pressable, ScrollView, Image, StyleSheet } from 'react-native';
import type { DiscoverItem } from '@/lib/types';
import { PLACE_CATEGORIES, ENTITY_TYPES } from '@/lib/constants';
import SaveButton from '@/components/collections/SaveButton';

interface DetailPanelProps {
  item: DiscoverItem;
  onBack: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getBadgeColor(item: DiscoverItem): string {
  if (item.entityType === 'event') return ENTITY_TYPES.event.color;
  if (item.category && item.category in PLACE_CATEGORIES) {
    return PLACE_CATEGORIES[item.category].color;
  }
  return ENTITY_TYPES.place.color;
}

function getBadgeLabel(item: DiscoverItem): string {
  if (item.entityType === 'event') return item.subcategory ?? 'Event';
  if (item.category && item.category in PLACE_CATEGORIES) {
    return PLACE_CATEGORIES[item.category].label;
  }
  return 'Place';
}

export default function DetailPanel({ item, onBack, isSaved, onToggleSave }: DetailPanelProps) {
  const badgeColor = getBadgeColor(item);
  const badgeLabel = getBadgeLabel(item);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Image */}
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
        {onToggleSave && (
          <View style={styles.saveContainer}>
            <SaveButton isSaved={isSaved ?? false} onToggle={onToggleSave} />
          </View>
        )}
      </View>

      {/* Title + Rating */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{item.name}</Text>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {[item.subcategory, item.neighborhood].filter(Boolean).join(' · ')}
      </Text>

      {/* Price range */}
      {item.priceRange && <Text style={styles.meta}>Price: {item.priceRange}</Text>}

      {/* Event details */}
      {item.entityType === 'event' && (
        <View style={styles.eventDetails}>
          {item.startsAt && (
            <Text style={styles.meta}>Starts: {formatEventDate(item.startsAt)}</Text>
          )}
          {item.endsAt && (
            <Text style={styles.meta}>Ends: {formatEventDate(item.endsAt)}</Text>
          )}
          {item.venueName && <Text style={styles.meta}>Venue: {item.venueName}</Text>}
          {item.attendingCount != null && (
            <Text style={styles.meta}>
              {item.attendingCount.toLocaleString()} attending
            </Text>
          )}
        </View>
      )}

      {/* Description */}
      {item.description && <Text style={styles.description}>{item.description}</Text>}

      {/* Tags */}
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Get Directions</Text>
        </Pressable>
        {item.websiteUrl && (
          <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]}>
            <Text style={[styles.actionBtnText, styles.actionBtnSecondaryText]}>Website</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    flex: 1,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#e8e8e8',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  saveContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingStar: {
    fontSize: 16,
    color: '#1a1a2e',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventDetails: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginVertical: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#555',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
  },
  actionBtnSecondaryText: {
    color: '#1a1a2e',
  },
});
