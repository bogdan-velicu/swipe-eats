import { useEffect, useState } from 'react';
import { placePhotoUrls, placeReviews, type Review } from '../../backend/placesClient';

export interface PlaceDetail {
  photos: string[];
  reviews: Review[];
  loading: boolean;
}

const EMPTY: PlaceDetail = { photos: [], reviews: [], loading: false };

/**
 * Fetches photo URLs and reviews fresh at view time. Google Places ToS: this
 * content is held in component state only — never written to Firestore or
 * AsyncStorage. Reviews are returned exactly as Google supplies them (with
 * attributions); nothing is added, trimmed of attribution, or cached.
 */
export function usePlaceDetail(placeId: string | undefined): PlaceDetail {
  const [state, setState] = useState<PlaceDetail>(placeId ? { ...EMPTY, loading: true } : EMPTY);

  useEffect(() => {
    if (!placeId) {
      setState(EMPTY);
      return;
    }
    let live = true;
    setState({ ...EMPTY, loading: true });
    Promise.all([
      placePhotoUrls(placeId).catch(() => [] as string[]),
      placeReviews(placeId).catch(() => [] as Review[]),
    ]).then(([photos, reviews]) => {
      if (live) setState({ photos, reviews, loading: false });
    });
    return () => {
      live = false;
    };
  }, [placeId]);

  return state;
}
