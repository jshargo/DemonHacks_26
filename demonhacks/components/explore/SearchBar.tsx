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
import { useExploreStore } from '@/stores/explore-store';
import { useMapboxSearch } from '@/hooks/useMapboxSearch';
import type { SearchSuggestion } from '@/lib/types';

const EXPLORE_DEBOUNCE_MS = 200;

/** Icon by feature type */
function featureIcon(type: string): string {
  switch (type) {
    case 'poi':
      return '\u{1F4CD}'; // 📍
    case 'address':
      return '\u{1F3E0}'; // 🏠
    case 'place':
      return '\u{1F306}'; // 🌆
    default:
      return '\u{1F50D}'; // 🔍
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
      // Update Mapbox search
      setQuery(text);

      // Also update local explore store filter (debounced)
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
    // Small delay to allow suggestion press to register
    setTimeout(() => dismissDropdown(), 150);
  }, [dismissDropdown]);

  return (
    <View style={styles.container}>
      {/* Search pill */}
      <View style={styles.pill}>
        <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search Chicago..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          autoCorrect={false}
          returnKeyType="search"
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#999" style={styles.spinner} />
        )}
        {query.length > 0 && !isSearching && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Text style={styles.clearBtn}>{'\u2715'}</Text>
          </Pressable>
        )}
      </View>

      {/* Autocomplete dropdown */}
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
                <Text style={styles.suggestionIcon}>
                  {featureIcon(s.feature_type)}
                </Text>
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
      {/* Header */}
      <View style={detailStyles.header}>
        <Text style={detailStyles.name} numberOfLines={2}>
          {result.name}
        </Text>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text style={detailStyles.dismiss}>{'\u2715'}</Text>
        </Pressable>
      </View>

      {/* Category badge */}
      {result.category && (
        <View style={detailStyles.categoryRow}>
          <View style={detailStyles.badge}>
            <Text style={detailStyles.badgeText}>{result.category}</Text>
          </View>
        </View>
      )}

      {/* Address */}
      <Text style={detailStyles.address}>{result.full_address}</Text>

      {/* Contact info */}
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

      {/* Action buttons */}
      <View style={detailStyles.actions}>
        <Pressable style={detailStyles.directionsBtn} onPress={handleDirections}>
          <Text style={detailStyles.directionsBtnText}>Get Directions</Text>
        </Pressable>
        <Pressable style={detailStyles.closeBtn} onPress={onDismiss}>
          <Text style={detailStyles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 200,
  },
  pill: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
    outlineStyle: 'none',
  } as never,
  spinner: {
    marginLeft: 8,
  },
  clearBtn: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
    fontWeight: '600',
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 320,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  suggestionRowPressed: {
    backgroundColor: '#f5f5f5',
  },
  suggestionIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  suggestionText: {
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
});

const detailStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    maxWidth: 420,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 12,
  },
  dismiss: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  address: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  contactText: {
    fontSize: 13,
    color: '#666',
  },
  websiteLink: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  directionsBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  directionsBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  closeBtn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 14,
  },
});
