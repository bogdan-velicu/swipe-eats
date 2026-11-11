import { createElement, act } from 'react';
import { createRoot } from 'test-renderer';
import { usePlaceDetail } from '../use-place-detail';
import { placePhotoUrls, placeReviews, type Review } from '../../../backend/placesClient';

jest.mock('../../../backend/placesClient', () => ({
  placePhotoUrls: jest.fn(),
  placeReviews: jest.fn(),
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const photosMock = placePhotoUrls as unknown as jest.Mock;
const reviewsMock = placeReviews as unknown as jest.Mock;

type Detail = ReturnType<typeof usePlaceDetail>;

async function render(placeId: string | undefined) {
  const out: { cur?: Detail } = {};
  function Probe() {
    out.cur = usePlaceDetail(placeId);
    return null;
  }
  const root = createRoot();
  await act(async () => {
    root.render(createElement(Probe));
  });
  return { out, root };
}

const review = (n: number): Review => ({
  rating: 5,
  text: `great ${n}`,
  attributions: { authorName: `Author ${n}`, authorUri: `https://maps.example/${n}` },
});

describe('usePlaceDetail', () => {
  beforeEach(() => {
    photosMock.mockReset();
    reviewsMock.mockReset();
  });

  it('fetches photos and reviews via the client and exposes them', async () => {
    photosMock.mockResolvedValue(['u1', 'u2']);
    reviewsMock.mockResolvedValue([review(1), review(2)]);
    const { out } = await render('p1');
    expect(photosMock).toHaveBeenCalledWith('p1');
    expect(reviewsMock).toHaveBeenCalledWith('p1');
    expect(out.cur!.photos).toEqual(['u1', 'u2']);
    expect(out.cur!.reviews).toHaveLength(2);
    expect(out.cur!.loading).toBe(false);
  });

  it('is loading until the fetch settles', async () => {
    let resolve!: (v: string[]) => void;
    photosMock.mockReturnValue(new Promise<string[]>((r) => (resolve = r)));
    reviewsMock.mockResolvedValue([]);
    const { out } = await render('p1');
    expect(out.cur!.loading).toBe(true);
    await act(async () => resolve(['u']));
    expect(out.cur!.loading).toBe(false);
    expect(out.cur!.photos).toEqual(['u']);
  });

  it('returns exactly what Google returns (no padding) and keeps attribution', async () => {
    reviewsMock.mockResolvedValue([review(1), review(2), review(3), review(4), review(5)]);
    photosMock.mockResolvedValue([]);
    const { out } = await render('p1');
    expect(out.cur!.reviews).toHaveLength(5);
    expect(out.cur!.reviews[0].attributions).toEqual({
      authorName: 'Author 1',
      authorUri: 'https://maps.example/1',
    });
  });

  it('does not fetch when placeId is undefined', async () => {
    const { out } = await render(undefined);
    expect(photosMock).not.toHaveBeenCalled();
    expect(reviewsMock).not.toHaveBeenCalled();
    expect(out.cur).toEqual({ photos: [], reviews: [], loading: false });
  });

  it('degrades to empty on fetch failure', async () => {
    photosMock.mockRejectedValue(new Error('x'));
    reviewsMock.mockRejectedValue(new Error('y'));
    const { out } = await render('p1');
    expect(out.cur).toEqual({ photos: [], reviews: [], loading: false });
  });

  it('ignores results that arrive after unmount', async () => {
    let resolve!: (v: string[]) => void;
    photosMock.mockReturnValue(new Promise<string[]>((r) => (resolve = r)));
    reviewsMock.mockResolvedValue([]);
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { root } = await render('p1');
    await act(async () => root.unmount());
    await act(async () => resolve(['late']));
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
