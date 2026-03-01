// FiltersModal — Airbnb-style centered dialog with 3 dropdown filters.
// Fully wired: backdrop close, X close, Escape close, scroll lock, focus trap,
// persistent values (only "Clear all" resets).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    TextInput,
    ScrollView,
    StyleSheet,
    Platform,
} from 'react-native';
import { useFilterStore, type FilterCategory, type DistanceFrom } from '@/stores/filter-store';
import { CHICAGO_NEIGHBORHOOD_NAMES } from '@/lib/neighborhood-names';

// ─── Option constants ──────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: FilterCategory; label: string }[] = [
    { value: 'food_drink', label: 'Food & Drink' },
    { value: 'outdoors', label: 'Outdoors' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'arts_culture', label: 'Arts & Culture' },
    { value: 'events', label: 'Events' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'volunteering', label: 'Volunteering' },
];

const DISTANCE_OPTIONS: { value: DistanceFrom; label: string }[] = [
    { value: 'divvy', label: 'Divvy station' },
    { value: 'cta_train', label: 'CTA train station' },
    { value: 'bus_stop', label: 'Bus stop' },
];

// ─── Dropdown component ────────────────────────────────────────────────────

interface DropdownProps {
    label: string;
    value: string | null;
    options: { value: string; label: string }[];
    onSelect: (value: string | null) => void;
    searchable?: boolean;
}

function FilterDropdown({ label, value, options, onSelect, searchable }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = searchable && search.length > 0
        ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

    const handleSelect = useCallback(
        (val: string) => {
            onSelect(val === value ? null : val); // toggle off if same
            setIsOpen(false);
            setSearch('');
        },
        [onSelect, value],
    );

    return (
        <View style={dropdownStyles.container}>
            <Text style={dropdownStyles.label}>{label}</Text>
            <Pressable
                style={[dropdownStyles.trigger, isOpen && dropdownStyles.triggerActive]}
                onPress={() => setIsOpen((prev) => !prev)}
            >
                <Text
                    style={[
                        dropdownStyles.triggerText,
                        !selectedLabel && dropdownStyles.placeholder,
                    ]}
                    numberOfLines={1}
                >
                    {selectedLabel ?? 'Any'}
                </Text>
                <Text style={dropdownStyles.chevron}>{isOpen ? '▲' : '▼'}</Text>
            </Pressable>

            {isOpen && (
                <View style={dropdownStyles.menu}>
                    {searchable && (
                        <View style={dropdownStyles.searchRow}>
                            <TextInput
                                style={dropdownStyles.searchInput}
                                placeholder="Search…"
                                placeholderTextColor="#999"
                                value={search}
                                onChangeText={setSearch}
                                autoFocus
                            />
                        </View>
                    )}
                    <ScrollView
                        style={dropdownStyles.menuScroll}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                    >
                        {filtered.map((o) => (
                            <Pressable
                                key={o.value}
                                style={({ pressed }) => [
                                    dropdownStyles.option,
                                    o.value === value && dropdownStyles.optionSelected,
                                    pressed && dropdownStyles.optionPressed,
                                ]}
                                onPress={() => handleSelect(o.value)}
                            >
                                <Text
                                    style={[
                                        dropdownStyles.optionText,
                                        o.value === value && dropdownStyles.optionTextSelected,
                                    ]}
                                >
                                    {o.label}
                                </Text>
                                {o.value === value && (
                                    <Text style={dropdownStyles.checkmark}>✓</Text>
                                )}
                            </Pressable>
                        ))}
                        {filtered.length === 0 && (
                            <Text style={dropdownStyles.empty}>No results</Text>
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

// ─── Main modal ────────────────────────────────────────────────────────────

interface FiltersModalProps {
    /** Called after "Show results" applies filters — allows parent to act */
    onApply?: () => void;
}

export default function FiltersModal({ onApply }: FiltersModalProps) {
    const isOpen = useFilterStore((s) => s.isModalOpen);
    const closeModal = useFilterStore((s) => s.closeModal);
    const clearAll = useFilterStore((s) => s.clearAll);

    const selectedCategory = useFilterStore((s) => s.selectedCategory);
    const selectedNeighborhood = useFilterStore((s) => s.selectedNeighborhood);
    const selectedDistanceFrom = useFilterStore((s) => s.selectedDistanceFrom);
    const setCategory = useFilterStore((s) => s.setCategory);
    const setNeighborhood = useFilterStore((s) => s.setNeighborhood);
    const setDistanceFrom = useFilterStore((s) => s.setDistanceFrom);

    const dialogRef = useRef<View>(null);

    // ── Escape key listener ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || Platform.OS !== 'web') return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, closeModal]);

    // ── Scroll lock ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // ── Focus trap (basic) ───────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || Platform.OS !== 'web') return;
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const modal = document.querySelector('[data-filters-modal]') as HTMLElement | null;
            if (!modal) return;
            const focusable = modal.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleShowResults = useCallback(() => {
        // Do NOT reset filters — just close and notify parent
        closeModal();
        onApply?.();
    }, [closeModal, onApply]);

    const handleClearAll = useCallback(() => {
        clearAll();
    }, [clearAll]);

    // Build neighborhood options from static list
    const neighborhoodOptions = CHICAGO_NEIGHBORHOOD_NAMES.map((n) => ({
        value: n,
        label: n,
    }));

    if (!isOpen) return null;

    return (
        <View
            style={modalStyles.overlay}
            // @ts-ignore — web-only prop
            dataSet={{ filtersModal: true }}
        >
            {/* Backdrop — click to close */}
            <Pressable style={modalStyles.backdrop} onPress={closeModal} />

            {/* Dialog card */}
            <View
                ref={dialogRef}
                style={modalStyles.dialog}
                // @ts-ignore — web-only attribute for focus trap selector
                dataSet={{ filtersModal: true }}
                {...(Platform.OS === 'web' ? { 'data-filters-modal': 'true' } as any : {})}
            >
                {/* ── Header ─────────────────────────────────────────────────── */}
                <View style={modalStyles.header}>
                    <View style={modalStyles.headerSpacer} />
                    <Text style={modalStyles.headerTitle}>Filters</Text>
                    <Pressable
                        onPress={closeModal}
                        style={modalStyles.closeBtn}
                        hitSlop={8}
                        accessibilityLabel="Close filters"
                        accessibilityRole="button"
                    >
                        <Text style={modalStyles.closeBtnText}>✕</Text>
                    </Pressable>
                </View>

                <View style={modalStyles.divider} />

                {/* ── Scrollable body ────────────────────────────────────────── */}
                <ScrollView
                    style={modalStyles.body}
                    contentContainerStyle={modalStyles.bodyContent}
                    showsVerticalScrollIndicator={true}
                >
                    {/* Category */}
                    <FilterDropdown
                        label="Category"
                        value={selectedCategory}
                        options={CATEGORY_OPTIONS}
                        onSelect={(v) => setCategory(v as FilterCategory | null)}
                    />

                    <View style={modalStyles.sectionDivider} />

                    {/* Neighborhood */}
                    <FilterDropdown
                        label="Neighborhood"
                        value={selectedNeighborhood}
                        options={neighborhoodOptions}
                        onSelect={setNeighborhood}
                        searchable
                    />

                    <View style={modalStyles.sectionDivider} />

                    {/* Distance from */}
                    <FilterDropdown
                        label="Distance from"
                        value={selectedDistanceFrom}
                        options={DISTANCE_OPTIONS}
                        onSelect={(v) => setDistanceFrom(v as DistanceFrom | null)}
                    />
                </ScrollView>

                <View style={modalStyles.divider} />

                {/* ── Sticky footer ──────────────────────────────────────────── */}
                <View style={modalStyles.footer}>
                    <Pressable onPress={handleClearAll} hitSlop={8}>
                        <Text style={modalStyles.clearAllText}>Clear all</Text>
                    </Pressable>
                    <Pressable style={modalStyles.showResultsBtn} onPress={handleShowResults}>
                        <Text style={modalStyles.showResultsText}>Show results</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

// ─── Modal styles ──────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    dialog: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '90%',
        maxWidth: 560,
        maxHeight: '85%',
        zIndex: 1,
        overflow: 'hidden',
        // shadow
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
    } as any,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerSpacer: {
        width: 32,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: {
        fontSize: 14,
        color: '#222',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#ebebeb',
    },
    body: {
        flexGrow: 1,
        flexShrink: 1,
    },
    bodyContent: {
        padding: 24,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#ebebeb',
        marginVertical: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    clearAllText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a2e',
        textDecorationLine: 'underline',
    },
    showResultsBtn: {
        backgroundColor: '#1a1a2e',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 10,
    },
    showResultsText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});

// ─── Dropdown styles ───────────────────────────────────────────────────────

const dropdownStyles = StyleSheet.create({
    container: {
        marginBottom: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 10,
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    triggerActive: {
        borderColor: '#1a1a2e',
    },
    triggerText: {
        fontSize: 15,
        color: '#1a1a2e',
        flex: 1,
    },
    placeholder: {
        color: '#999',
    },
    chevron: {
        fontSize: 10,
        color: '#999',
        marginLeft: 8,
    },
    menu: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        backgroundColor: '#fff',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        overflow: 'hidden',
    } as any,
    menuScroll: {
        maxHeight: 200,
    },
    searchRow: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchInput: {
        fontSize: 14,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        color: '#1a1a2e',
        outlineStyle: 'none',
    } as any,
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f8f8',
    },
    optionSelected: {
        backgroundColor: '#f5f5f5',
    },
    optionPressed: {
        backgroundColor: '#efefef',
    },
    optionText: {
        fontSize: 14,
        color: '#333',
    },
    optionTextSelected: {
        fontWeight: '700',
        color: '#1a1a2e',
    },
    checkmark: {
        fontSize: 14,
        color: '#1a1a2e',
        fontWeight: '700',
    },
    empty: {
        padding: 14,
        textAlign: 'center',
        color: '#999',
        fontSize: 13,
    },
});
