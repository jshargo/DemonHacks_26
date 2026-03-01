import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { ChevronLeft, Star, Navigation, Globe } from 'lucide-react-native';
import type { DiscoverItem } from '@/lib/types';
import { PLACE_CATEGORIES, ENTITY_TYPES } from '@/lib/constants';
import SaveButton from '@/components/collections/SaveButton';
import ImageCarousel from '@/components/ui/ImageCarousel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';

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
      <View style={styles.imageContainer}>
        <ImageCarousel
          imageUrl={item.imageUrl}
          photoUrls={item.photoUrls ?? []}
        />
        <View style={styles.badgeWrap}>
          <Badge text={badgeLabel} color={badgeColor} variant="filled" size="md" />
        </View>
        {onToggleSave && (
          <View style={styles.saveContainer}>
            <SaveButton isSaved={isSaved ?? false} onToggle={onToggleSave} />
          </View>
        )}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{item.name}</Text>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Star size={16} color={colors.textPrimary} fill={colors.textPrimary} />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.subtitle}>
        {[item.subcategory, item.neighborhood].filter(Boolean).join(' · ')}
      </Text>

      {item.priceRange && (
        <Text style={styles.meta}>Price: {item.priceRange}</Text>
      )}

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

      {item.description && <Text style={styles.description}>{item.description}</Text>}

      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title="Get Directions"
          variant="primary"
          size="lg"
          leftIcon={<Navigation size={18} color={colors.textInverse} />}
          style={styles.actionBtn}
        />
        {item.websiteUrl && (
          <Button
            title="Website"
            variant="secondary"
            size="lg"
            leftIcon={<Globe size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  badgeWrap: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  saveContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.displaySm,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    ...typography.headingSm,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  eventDetails: {
    marginVertical: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  description: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    marginVertical: spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  tagText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
