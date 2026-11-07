// Place suggestions for the "Where?" box, from Photon (OpenStreetMap data, run by komoot).
// It's a free public server that allows search-as-you-type but throttles heavy use, so we
// wait for a pause in typing and remember answers. https://photon.komoot.io
const PHOTON = 'https://photon.komoot.io/api/';
const LIMIT = 8;
const SHOWN = 5;

export type Place = {
  id: string;
  name: string;
  // Street and area, shown under the name.
  detail: string;
  // What goes in the box when it's picked.
  label: string;
};

type PhotonFeature = {
  properties: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
  };
};

const cache = new Map<string, Place[]>();

export async function searchPlaces(query: string, country: string | null, signal: AbortSignal) {
  const key = `${country ?? ''}:${query.trim().toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({ q: query.trim(), lang: 'en', limit: String(LIMIT) });
  if (country) params.set('countrycode', country);
  const response = await fetch(`${PHOTON}?${params}`, { signal });
  if (!response.ok) return [];
  const { features } = (await response.json()) as { features: PhotonFeature[] };

  const seen = new Set<string>();
  const places = features
    .map(({ properties: p }) => {
      // Roads aren't somewhere to meet, and a result without a name isn't a place.
      if (!p.name || p.osm_key === 'highway') return null;
      const street = [p.housenumber, p.street].filter(Boolean).join(' ');
      const area = p.district ?? p.city;
      const label = [p.name, area].filter(Boolean).join(', ');
      if (seen.has(label)) return null;
      seen.add(label);
      return {
        id: `${p.osm_type}${p.osm_id}`,
        name: p.name,
        detail: [street, area].filter(Boolean).join(', '),
        label,
      };
    })
    .filter((place): place is Place => place !== null)
    .slice(0, SHOWN);
  cache.set(key, places);
  return places;
}
