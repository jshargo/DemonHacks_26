// CTAToggle — Toggle buttons for CTA rail/bus/train overlays.
// Positioned above the existing 3D toggle in the bottom-right corner.
// The first button slot doubles as Pen when draw mode is active.

import { View, Pressable, Text, StyleSheet } from 'react-native';
import { TrainFront, Bus, Train, Bike, Footprints, Ticket } from 'lucide-react-native';
import { useCTAStore } from '@/stores/cta-store';
import { colors, shadows, spacing, radii } from '@/lib/theme';

type ToggleConfig = {
  key: string;
  icon: typeof TrainFront;
  isActive: boolean;
  onPress: () => void;
  accentColor: string;
};

interface CTAToggleProps {
  /** Whether pen (draw) mode is active */
  isDrawMode?: boolean;
  /** Callback to toggle pen mode */
  onToggleDrawMode?: () => void;
}

export default function CTAToggle({
  isDrawMode = false,
  onToggleDrawMode,
}: CTAToggleProps) {
  const showRailLines = useCTAStore((s) => s.showRailLines);
  const showBusRoutes = useCTAStore((s) => s.showBusRoutes);
  const showLiveTrains = useCTAStore((s) => s.showLiveTrains);
  const showDivvyStations = useCTAStore((s) => s.showDivvyStations);
  const showPedwayRoutes = useCTAStore((s) => s.showPedwayRoutes);
  const showTicketmasterEvents = useCTAStore((s) => s.showTicketmasterEvents);
  const toggleRailLines = useCTAStore((s) => s.toggleRailLines);
  const toggleBusRoutes = useCTAStore((s) => s.toggleBusRoutes);
  const toggleLiveTrains = useCTAStore((s) => s.toggleLiveTrains);
  const toggleDivvyStations = useCTAStore((s) => s.toggleDivvyStations);
  const togglePedwayRoutes = useCTAStore((s) => s.togglePedwayRoutes);
  const toggleTicketmasterEvents = useCTAStore((s) => s.toggleTicketmasterEvents);

  const toggles: ToggleConfig[] = [
    {
      key: 'train',
      icon: TrainFront,
      isActive: showLiveTrains,
      onPress: toggleLiveTrains,
      accentColor: '#c60c30',
    },
    {
      key: 'rail',
      icon: Train,
      isActive: showRailLines && !showLiveTrains,
      onPress: toggleRailLines,
      accentColor: '#00a1de',
    },
    {
      key: 'bus',
      icon: Bus,
      isActive: showBusRoutes,
      onPress: toggleBusRoutes,
      accentColor: '#1a73e8',
    },
    {
      key: 'divvy',
      icon: Bike,
      isActive: showDivvyStations,
      onPress: toggleDivvyStations,
      accentColor: '#00a1de',
    },
    {
      key: 'pedway',
      icon: Footprints,
      isActive: showPedwayRoutes,
      onPress: togglePedwayRoutes,
      accentColor: '#e07c24',
    },
    {
      key: 'ticketmaster',
      icon: Ticket,
      isActive: showTicketmasterEvents,
      onPress: toggleTicketmasterEvents,
      accentColor: '#ff4d4d',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Pen icon — always first (top of stack), never moves */}
      <Pressable
        style={[styles.btn, isDrawMode && styles.btnActive]}
        onPress={onToggleDrawMode}
        accessibilityLabel={isDrawMode ? 'Exit draw mode' : 'Enter draw mode'}
        accessibilityRole="button"
      >
        <Text style={{ fontSize: 20 }}>✏️</Text>
      </Pressable>

      {/* Remaining buttons — hidden when pen mode is ON */}
      {!isDrawMode && toggles.map(({ key, icon: Icon, isActive, onPress, accentColor }) => (
        <Pressable
          key={key}
          style={[styles.btn, isActive && styles.btnActive]}
          onPress={onPress}
        >
          <Icon
            size={20}
            color={isActive ? colors.textInverse : colors.textPrimary}
          />
          {isActive && (
            <View style={[styles.accent, { backgroundColor: accentColor }]} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    zIndex: 10,
    gap: spacing.sm,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    overflow: 'hidden',
  },
  btnActive: {
    backgroundColor: colors.primary,
  },
  accent: {
    position: 'absolute',
    bottom: 0,
    left: spacing.sm,
    right: spacing.sm,
    height: 3,
    borderRadius: 2,
  },
});
