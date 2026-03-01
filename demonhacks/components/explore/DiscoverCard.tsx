import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import type { DiscoverItem } from '@/lib/types';
import { PLACE_CATEGORIES, ENTITY_TYPES } from '@/lib/constants';
import SaveButton from '@/components/collections/SaveButton';
import { colors, fonts, typography, spacing, radii, shadows } from '@/lib/theme';

interface DiscoverCardProps {
  item: DiscoverItem;
  onPress: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  isHighlighted?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

function formatEventDate(startsAt: string): string {
  const d = new Date(startsAt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      style={({ pressed }) => [
        styles.card,
        isHighlighted && styles.cardHighlighted,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      onHoverIn={onHover}
      onHoverOut={onHoverEnd}
    >
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

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Star size={13} color={colors.textPrimary} fill={colors.textPrimary} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {item.placeFormatted || [item.subcategory, item.neighborhood].filter(Boolean).join(' · ')}
        </Text>

        {item.entityType === 'event' && item.startsAt && (
          <Text style={styles.meta}>{formatEventDate(item.startsAt)}</Text>
        )}
        {item.entityType === 'place' && item.priceRange && (
          <Text style={styles.meta}>{item.priceRange}</Text>
        )}

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
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.card,
  },
  cardHighlighted: {
    borderColor: colors.primary,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 3 / 2,
  },
  image: {
    width: '100%' as unknown as number,
    height: '100%' as unknown as number,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  imagePlaceholder: {
    width: '100%' as unknown as number,
    height: '100%' as unknown as number,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  saveContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  content: {
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    ...typography.headingSm,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...typography.labelMd,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  tagText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
