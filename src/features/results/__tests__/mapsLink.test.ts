import { geoUri, mapsDirectionsUrl } from '../mapsLink';

describe('mapsDirectionsUrl', () => {
  it('uses name + address with place id and encodes the destination', () => {
    const url = mapsDirectionsUrl({ id: '1', kind: 'place', name: 'Joe & Sons Pizza', address: '1 Main St', placeId: 'ChIJabc' });
    expect(url.startsWith('https://www.google.com/maps/dir/?api=1&')).toBe(true);
    expect(url).toContain('destination=Joe%20%26%20Sons%20Pizza%2C%201%20Main%20St');
    expect(url).toContain('destination_place_id=ChIJabc');
  });
  it('falls back to coordinates when no name', () => {
    const url = mapsDirectionsUrl({ id: '1', kind: 'place', name: '', location: { lat: 1.5, lng: -2.25 } });
    expect(url).toContain('destination=1.5%2C-2.25');
  });
  it('uses the name alone when there is no address or location', () => {
    const url = mapsDirectionsUrl({ id: '1', kind: 'place', name: 'Cafe' });
    expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=Cafe');
  });
});

describe('geoUri', () => {
  it('uses coordinates with a labelled pin when a location is present', () => {
    const uri = geoUri({ id: '1', kind: 'place', name: 'Ave Mario', location: { lat: 51.5, lng: -0.1 } });
    expect(uri).toBe('geo:51.5,-0.1?q=51.5,-0.1(Ave%20Mario)');
  });
  it('falls back to a text query when there is no location', () => {
    const uri = geoUri({ id: '1', kind: 'place', name: 'Pizza Place', address: '1 Main St' });
    expect(uri).toBe('geo:0,0?q=Pizza%20Place%2C%201%20Main%20St');
  });
});
