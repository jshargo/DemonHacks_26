// CTAToggle — Toggle buttons for CTA rail/bus/train overlays.
// Positioned above the existing 3D toggle in the bottom-right corner.

import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useCTAStore } from '@/stores/cta-store';

export default function CTAToggle() {
  const showRailLines = useCTAStore((s) => s.showRailLines);
  const showBusRoutes = useCTAStore((s) => s.showBusRoutes);
  const showLiveTrains = useCTAStore((s) => s.showLiveTrains);
  const showDivvyStations = useCTAStore((s) => s.showDivvyStations);
  const showPedwayRoutes = useCTAStore((s) => s.showPedwayRoutes);
  const toggleRailLines = useCTAStore((s) => s.toggleRailLines);
  const toggleBusRoutes = useCTAStore((s) => s.toggleBusRoutes);
  const toggleLiveTrains = useCTAStore((s) => s.toggleLiveTrains);
  const toggleDivvyStations = useCTAStore((s) => s.toggleDivvyStations);
  const togglePedwayRoutes = useCTAStore((s) => s.togglePedwayRoutes);
  const showTicketmasterEvents = useCTAStore((s) => s.showTicketmasterEvents);
  const toggleTicketmasterEvents = useCTAStore((s) => s.toggleTicketmasterEvents);

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.btn, showLiveTrains && styles.btnActive]}
        onPress={toggleLiveTrains}
      >
        <Text style={[styles.icon, showLiveTrains && styles.iconActive]}>🚇</Text>
        {showLiveTrains && <View style={[styles.accent, { backgroundColor: '#c60c30' }]} />}
      </Pressable>

      <Pressable
        style={[styles.btn, showRailLines && !showLiveTrains && styles.btnActive]}
        onPress={toggleRailLines}
      >
        <Text style={[styles.icon, showRailLines && styles.iconActive]}>🛤️</Text>
        {showRailLines && <View style={[styles.accent, { backgroundColor: '#00a1de' }]} />}
      </Pressable>

      <Pressable
        style={[styles.btn, showBusRoutes && styles.btnActive]}
        onPress={toggleBusRoutes}
      >
        <Text style={[styles.icon, showBusRoutes && styles.iconActive]}>🚌</Text>
        {showBusRoutes && <View style={[styles.accent, { backgroundColor: '#1a73e8' }]} />}
      </Pressable>

      <Pressable
        style={[styles.btn, showDivvyStations && styles.btnActive]}
        onPress={toggleDivvyStations}
      >
        <Text style={[styles.icon, showDivvyStations && styles.iconActive]}>🚲</Text>
        {showDivvyStations && <View style={[styles.accent, { backgroundColor: '#00a1de' }]} />}
      </Pressable>

      <Pressable
        style={[styles.btn, showPedwayRoutes && styles.btnActive]}
        onPress={togglePedwayRoutes}
      >
        <Text style={[styles.icon, showPedwayRoutes && styles.iconActive]}>🚶</Text>
        {showPedwayRoutes && <View style={[styles.accent, { backgroundColor: '#e07c24' }]} />}
      </Pressable>

      <Pressable
        style={[styles.btn, showTicketmasterEvents && styles.btnActive]}
        onPress={toggleTicketmasterEvents}
      >
        <Text style={[styles.icon, showTicketmasterEvents && styles.iconActive]}>🎟️</Text>
        {showTicketmasterEvents && <View style={[styles.accent, { backgroundColor: '#ff4d4d' }]} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 10,
    gap: 8,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  btnActive: {
    backgroundColor: '#1a1a2e',
  },
  icon: {
    fontSize: 20,
  },
  iconActive: {
    // Emoji color doesn't change, but keep for potential future SVG icons
  },
  accent: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
  },
});
