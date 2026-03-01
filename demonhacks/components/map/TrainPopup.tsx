// TrainPopup — Shows detail for a clicked train marker.
// Displays route, destination, next station, ETA, and optional follow detail.

import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Popup } from 'react-map-gl/mapbox';
import { useCTAStore } from '@/stores/cta-store';
import { CTA_ROUTE_COLORS, CTA_ROUTE_NAMES, fetchTrainDetail } from '@/lib/cta';

function formatETA(arrT: string, prdt: string): string {
  // CTA times format: "YYYYMMDD HH:MM:SS"
  const parse = (s: string) => {
    const [date, time] = s.split(' ');
    const y = date.slice(0, 4);
    const m = date.slice(4, 6);
    const d = date.slice(6, 8);
    return new Date(`${y}-${m}-${d}T${time}`);
  };

  try {
    const arr = parse(arrT);
    const pred = parse(prdt);
    const diffMin = Math.round((arr.getTime() - pred.getTime()) / 60000);
    if (diffMin <= 1) return 'Due';
    return `${diffMin} min`;
  } catch {
    return arrT;
  }
}

export default function TrainPopup() {
  const selectedTrain = useCTAStore((s) => s.selectedTrain);
  const trainDetail = useCTAStore((s) => s.trainDetail);
  const isLoadingDetail = useCTAStore((s) => s.isLoadingDetail);
  const selectTrain = useCTAStore((s) => s.selectTrain);
  const setTrainDetail = useCTAStore((s) => s.setTrainDetail);
  const setIsLoadingDetail = useCTAStore((s) => s.setIsLoadingDetail);

  const handleFollow = useCallback(async () => {
    if (!selectedTrain) return;
    setIsLoadingDetail(true);
    try {
      const detail = await fetchTrainDetail(selectedTrain.rn);
      setTrainDetail(detail);
    } catch {
      setTrainDetail(null);
    }
  }, [selectedTrain, setTrainDetail, setIsLoadingDetail]);

  if (!selectedTrain) return null;

  const routeColor = CTA_ROUTE_COLORS[selectedTrain.rt] ?? '#565a5c';
  const routeName = CTA_ROUTE_NAMES[selectedTrain.rt] ?? selectedTrain.rt;
  const eta = formatETA(selectedTrain.arrT, selectedTrain.prdt);

  return (
    <Popup
      longitude={selectedTrain.lon}
      latitude={selectedTrain.lat}
      anchor="bottom"
      offset={20}
      closeOnClick={false}
      onClose={() => selectTrain(null)}
      style={{ maxWidth: '280px' }}
    >
      <View style={styles.container}>
        {/* Route color band */}
        <View style={[styles.colorBand, { backgroundColor: routeColor }]} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.routeName, { color: routeColor }]}>{routeName}</Text>
            <Text style={styles.runNumber}>#{selectedTrain.rn}</Text>
          </View>

          {/* Destination */}
          <Text style={styles.dest}>→ {selectedTrain.destNm}</Text>

          {/* Next station + ETA */}
          <View style={styles.row}>
            <Text style={styles.label}>Next:</Text>
            <Text style={styles.value}>{selectedTrain.nextStaNm}</Text>
            <Text style={[styles.eta, eta === 'Due' && styles.etaDue]}>{eta}</Text>
          </View>

          {/* Status indicators */}
          {selectedTrain.isDly && (
            <View style={styles.delayBadge}>
              <Text style={styles.delayText}>Delayed</Text>
            </View>
          )}
          {selectedTrain.isApp && !selectedTrain.isDly && (
            <View style={styles.appBadge}>
              <Text style={styles.appText}>Approaching</Text>
            </View>
          )}

          {/* Follow button / detail */}
          {!trainDetail && !isLoadingDetail && (
            <Pressable style={[styles.followBtn, { backgroundColor: routeColor }]} onPress={handleFollow}>
              <Text style={styles.followText}>Show upcoming stops</Text>
            </Pressable>
          )}

          {isLoadingDetail && (
            <ActivityIndicator size="small" color={routeColor} style={{ marginTop: 8 }} />
          )}

          {trainDetail && (
            <View style={styles.stopsContainer}>
              <Text style={styles.stopsTitle}>Upcoming Stops</Text>
              {trainDetail.stops.slice(0, 6).map((stop, i) => (
                <View key={i} style={styles.stopRow}>
                  <Text style={styles.stopName}>{stop.staNm}</Text>
                  <Text style={[
                    styles.stopEta,
                    stop.isDly && styles.stopDelayed,
                  ]}>
                    {formatETA(stop.arrT, stop.prdt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 200,
  },
  colorBand: {
    height: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  content: {
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  runNumber: {
    fontSize: 11,
    color: '#71717a',
  },
  dest: {
    fontSize: 13,
    color: '#27272a',
    fontWeight: '600',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#71717a',
  },
  value: {
    fontSize: 12,
    color: '#27272a',
    flex: 1,
  },
  eta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#27272a',
  },
  etaDue: {
    color: '#16a34a',
  },
  delayBadge: {
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  delayText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },
  appBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  appText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
  },
  followBtn: {
    marginTop: 8,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  followText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stopsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    paddingTop: 6,
  },
  stopsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  stopName: {
    fontSize: 12,
    color: '#27272a',
  },
  stopEta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27272a',
  },
  stopDelayed: {
    color: '#dc2626',
  },
});
