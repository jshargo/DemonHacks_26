// Type augmentation for Mapbox GL JS Standard style API.
// The `setConfigProperty` method is part of Mapbox Standard but may not
// exist in @types/mapbox-gl yet.

import 'mapbox-gl';

declare module 'mapbox-gl' {
  interface Map {
    setConfigProperty(
      importId: string,
      configName: string,
      value: unknown
    ): this;
    getConfigProperty(importId: string, configName: string): unknown;
  }
}
