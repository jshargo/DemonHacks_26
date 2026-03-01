// SearchBar — Airbnb-style search pill with Mapbox autocomplete dropdown.
// Filters the local discover feed AND queries Mapbox Search Box API for
// addresses, POIs, and places beyond what's in our Supabase database.

import { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Search, X, MapPin, Home, Building2, Navigation } from 'lucide-react-native';
import { useExploreStore } from '@/stores/explore-store';
import { useMapboxSearch } from '@/hooks/useMapboxSearch';
import type { SearchSuggestion } from '@/lib/types';
import { colors, fonts, typography, spacing, radii, shadows, zIndex } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

const EXPLORE_DEBOUNCE_MS = 200;

function FeatureIcon({ type }: { type: string }) {
  const props = { size: 16, color: colors.textTertiary };
  switch (type) {
    case 'poi': return <MapPin {...props} />;
    case 'address': return <Home {...props} />;
    case 'place': return <Building2 {...props} />;
    default: return <Search {...props} />;
  }
}

export default function SearchBar() {
  const inputRef = useRef<TextInput>(null);
  const exploreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setExploreSearchQuery = useExploreStore((s) => s.setSearchQuery);

  const {
    query,
    setQuery,
    suggestions,
    isSearching,
    showDropdown,
    selectSuggestion,
    clearSearch,
    dismissDropdown,
  } = useMapboxSearch();

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (exploreTimerRef.current) clearTimeout(exploreTimerRef.current);
      exploreTimerRef.current = setTimeout(() => {
        setExploreSearchQuery(text);
      }, EXPLORE_DEBOUNCE_MS);
    },
    [setQuery, setExploreSearchQuery],
  );

  const handleClear = useCallback(() => {
    clearSearch();
    setExploreSearchQuery('');
    inputRef.current?.clear();
    inputRef.current?.focus();
  }, [clearSearch, setExploreSearchQuery]);

  const handleSelectSuggestion = useCallback(
    (suggestion: SearchSuggestion) => {
      selectSuggestion(suggestion);
      inputRef.current?.blur();
    },
    [selectSuggestion],
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => dismissDropdown(), 150);
  }, [dismissDropdown]);

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search Chicago..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          autoCorrect={false}
          returnKeyType="search"
        />
        {isSearching && (
          <ActivityIndicator size="small" color={colors.textTertiary} style={styles.spinner} />
        )}
        {query.length > 0 && !isSearching && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <X size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((s) => (
              <Pressable
                key={s.mapbox_id}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  pressed && styles.suggestionRowPressed,
                ]}
                onPress={() => handleSelectSuggestion(s)}
              >
                <View style={styles.suggestionIconWrap}>
                  <FeatureIcon type={s.feature_type} />
                </View>
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.suggestionAddress} numberOfLines={1}>
                    {s.place_formatted}
                  </Text>
                </View>
                {s.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {s.category}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── POI Detail Panel ───────────────────────────────────────────────────────

import type { SearchResult } from '@/lib/types';

interface POIDetailPanelProps {
  result: SearchResult;
  onDismiss: () => void;
}

export function POIDetailPanel({ result, onDismiss }: POIDetailPanelProps) {
  const handleDirections = useCallback(() => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lng}`;
    window.open(url, '_blank');
  }, [result.lat, result.lng]);

  return (
    <View style={detailStyles.container}>
      <View style={detailStyles.header}>
        <Text style={detailStyles.name} numberOfLines={2}>
          {result.name}
        </Text>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <X size={18} color={colors.textTertiary} />
        </Pressable>
      </View>

      {result.category && (
        <View style={detailStyles.categoryRow}>
          <View style={detailStyles.badge}>
            <Text style={detailStyles.badgeText}>{result.category}</Text>
          </View>
        </View>
      )}

      <Text style={detailStyles.address}>{result.full_address}</Text>

      {(result.phone || result.website) && (
        <View style={detailStyles.contactRow}>
          {result.phone && (
            <Text style={detailStyles.contactText}>{result.phone}</Text>
          )}
          {result.website && (
            <Pressable
              onPress={() => window.open(result.website, '_blank')}
            >
              <Text style={detailStyles.websiteLink}>Website</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={detailStyles.actions}>
        <Button
          title="Get Directions"
          variant="primary"
          size="md"
          leftIcon={<Navigation size={16} color={colors.textInverse} />}
          onPress={handleDirections}
          style={{ flex: 1 }}
        />
        <Button
          title="Close"
          variant="ghost"
          size="md"
          onPress={onDismiss}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: zIndex.modal,
  },
  pill: {
    backgroundColor: colors.white,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    outlineStyle: 'none',
  } as never,
  spinner: {
    marginLeft: spacing.sm,
  },
  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.md,
  },
  dropdownScroll: {
    maxHeight: 320,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  suggestionRowPressed: {
    backgroundColor: colors.surface,
  },
  suggestionIconWrap: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  suggestionText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  suggestionName: {
    ...typography.labelLg,
    color: colors.textPrimary,
  },
  suggestionAddress: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  categoryBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: fonts.medium,
  },
});

const detailStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: zIndex.modal,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    maxWidth: 420,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.headingMd,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  badgeText: {
    ...typography.bodySm,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  address: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  contactText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  websiteLink: {
    ...typography.bodySm,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
