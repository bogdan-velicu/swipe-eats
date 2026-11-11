import { useEffect } from 'react';
import { Image } from 'react-native';
import { placePhotoUrls } from '../../backend/placesClient';
import type { Candidate } from '../../core/types';

/**
 * Warms the photo cache (and the native image cache) for a set of places as soon as the
 * results screen mounts, so the podium and spotlight have their hero images ready instead
 * of flashing a placeholder. No-ops for places already cached from swiping.
 */
export function usePrefetchHeroes(candidates: Candidate[]): void {
  // A stable key so we only re-run when the set of place ids actually changes.
  const key = candidates
    .map((c) => c.placeId)
    .filter(Boolean)
    .join(',');

  useEffect(() => {
    let live = true;
    for (const c of candidates) {
      if (!c.placeId) continue;
      placePhotoUrls(c.placeId)
        .then((urls) => {
          if (live && urls[0]) Image.prefetch(urls[0]).catch(() => {});
        })
        .catch(() => {});
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
