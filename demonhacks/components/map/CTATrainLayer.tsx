// CTATrainLayer — Live train position Symbol Layer.
// Uses canvas-drawn icons registered by useCTATrainIcons.
// Icon rotation follows heading, with 3D perspective alignment.

import { Source, Layer } from 'react-map-gl/mapbox';
import { useCTAStore } from '@/stores/cta-store';

// Empty FeatureCollection as initial data (actual data set via source.setData)
const EMPTY_FC = {
  type: 'FeatureCollection' as const,
  features: [],
};

export default function CTATrainLayer() {
  const showLiveTrains = useCTAStore((s) => s.showLiveTrains);

  const visibility = showLiveTrains ? 'visible' : 'none';

  return (
    <Source id="cta-trains" type="geojson" data={EMPTY_FC}>
      <Layer
        id="cta-trains"
        type="symbol"
        layout={{
          'icon-image': ['concat', 'train-', ['get', 'rt']],
          'icon-rotate': ['get', 'heading'],
          'icon-rotation-alignment': 'map',
          'icon-pitch-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 13, 1.0, 15, 1.3],
          visibility,
        }}
      />
      <Layer
        id="cta-trains-delayed"
        type="circle"
        filter={['==', ['get', 'isDly'], true]}
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 14],
          'circle-color': 'transparent',
          'circle-stroke-color': '#c60c30',
          'circle-stroke-width': 2,
          'circle-stroke-opacity': 0.8,
        }}
        layout={{ visibility }}
      />
    </Source>
  );
}
