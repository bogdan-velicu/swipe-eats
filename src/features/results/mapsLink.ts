import type { Candidate } from '../../core/types';

/** Google Maps Directions URL (universal link: opens the Maps app when installed, else the web). */
export function mapsDirectionsUrl(c: Partial<Candidate> & Pick<Candidate, 'name'>): string {
  const label = [c.name, c.address].filter(Boolean).join(', ');
  const destination = label || (c.location ? `${c.location.lat},${c.location.lng}` : '');
  const parts = [`destination=${encodeURIComponent(destination)}`];
  if (c.placeId && label) parts.push(`destination_place_id=${encodeURIComponent(c.placeId)}`);
  return `https://www.google.com/maps/dir/?api=1&${parts.join('&')}`;
}

/** Android `geo:` URI. Opening it lets the OS offer whatever navigation apps are installed
 * (Google Maps, Waze, Bolt, …) rather than forcing one. */
export function geoUri(c: Partial<Candidate> & Pick<Candidate, 'name'>): string {
  if (c.location) {
    const { lat, lng } = c.location;
    return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(c.name)})`;
  }
  const label = [c.name, c.address].filter(Boolean).join(', ');
  return `geo:0,0?q=${encodeURIComponent(label)}`;
}
