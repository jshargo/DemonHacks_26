// Chicago timezone → Mapbox Standard light-preset mapping
// Uses Intl API to get current hour in Central Time, then maps to
// dawn / day / dusk / night presets. Subscribers get notified every 5 min.

export type LightPreset = 'dawn' | 'day' | 'dusk' | 'night';

/** Current hour (0-23) in America/Chicago timezone */
export function getChicagoHour(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'America/Chicago',
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === 'hour');
  return parseInt(hourPart?.value ?? '12', 10);
}

/** Map Chicago hour → light preset */
export function getChicagoLightPreset(): LightPreset {
  const hour = getChicagoHour();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/** Subscribe to light preset changes. Checks every 5 minutes.
 *  Returns a cleanup function to cancel the interval. */
export function subscribeLightPreset(
  onChange: (preset: LightPreset) => void
): () => void {
  let current = getChicagoLightPreset();
  onChange(current);

  const id = setInterval(() => {
    const next = getChicagoLightPreset();
    if (next !== current) {
      current = next;
      onChange(next);
    }
  }, 5 * 60 * 1000);

  return () => clearInterval(id);
}
