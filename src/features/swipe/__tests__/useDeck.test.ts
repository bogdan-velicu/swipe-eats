import { createElement, act } from 'react';
import { createRoot } from 'test-renderer';
import { useDeck } from '../useDeck';
import { recordSwipe } from '../../../backend/sessionService';
import type { Candidate, Session } from '../../../core/types';

jest.mock('../../../backend/sessionService', () => ({ recordSwipe: jest.fn() }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rec = recordSwipe as unknown as jest.Mock;
const cand = (id: string): Candidate => ({ id, kind: 'place', name: `Place ${id}` });
const mkSession = (ids: string[]): Session => ({ id: 's1', candidates: ids.map(cand) }) as Session;

type Deck = ReturnType<typeof useDeck>;

function setup(session: Session) {
  const out: { cur?: Deck } = {};
  function Probe() {
    out.cur = useDeck(session);
    return null;
  }
  const root = createRoot();
  return { out, root, Probe };
}

describe('useDeck', () => {
  beforeEach(() => {
    rec.mockReset();
    rec.mockResolvedValue(undefined);
  });

  it('like advances the deck and records LIKE for the current candidate', async () => {
    const { out, root, Probe } = setup(mkSession(['a', 'b', 'c']));
    await act(async () => root.render(createElement(Probe)));
    expect(out.cur?.current?.id).toBe('a');
    expect(out.cur?.next?.id).toBe('b');
    expect(out.cur?.remaining).toBe(3);
    expect(out.cur?.empty).toBe(false);

    await act(async () => out.cur!.like());
    expect(rec).toHaveBeenCalledWith('s1', 'a', 'LIKE');
    expect(out.cur?.current?.id).toBe('b');
    expect(out.cur?.next?.id).toBe('c');
    expect(out.cur?.remaining).toBe(2);
  });

  it('pass advances and records PASS; deck empties after the last card', async () => {
    const { out, root, Probe } = setup(mkSession(['a', 'b']));
    await act(async () => root.render(createElement(Probe)));
    await act(async () => out.cur!.pass());
    expect(rec).toHaveBeenLastCalledWith('s1', 'a', 'PASS');
    await act(async () => out.cur!.like());
    expect(rec).toHaveBeenLastCalledWith('s1', 'b', 'LIKE');
    expect(out.cur?.current).toBeNull();
    expect(out.cur?.next).toBeNull();
    expect(out.cur?.remaining).toBe(0);
    expect(out.cur?.empty).toBe(true);

    await act(async () => out.cur!.like()); // no-op when empty
    expect(rec).toHaveBeenCalledTimes(2);
  });

  it('zero candidates -> empty, no crash, like/pass are no-ops', async () => {
    const { out, root, Probe } = setup(mkSession([]));
    await act(async () => root.render(createElement(Probe)));
    expect(out.cur?.empty).toBe(true);
    expect(out.cur?.current).toBeNull();
    expect(out.cur?.next).toBeNull();
    expect(out.cur?.remaining).toBe(0);
    await act(async () => out.cur!.pass());
    expect(rec).not.toHaveBeenCalled();
  });

  it('a failed recordSwipe does not throw or stall the deck', async () => {
    rec.mockRejectedValue(new Error('offline'));
    const { out, root, Probe } = setup(mkSession(['a', 'b']));
    await act(async () => root.render(createElement(Probe)));
    await act(async () => out.cur!.like());
    expect(out.cur?.current?.id).toBe('b');
  });
});
