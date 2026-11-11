import { createElement, act } from 'react';
import { createRoot } from 'test-renderer';
import { useSession } from '../useSession';
import { observeSession } from '../../../backend/sessionService';
import type { Session } from '../../../core/types';

jest.mock('../../../backend/sessionService', () => ({ observeSession: jest.fn() }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const observe = observeSession as unknown as jest.Mock;
const sess = { id: 's1', code: 'ABC123' } as Session;

type State = ReturnType<typeof useSession>;

function setup(id: string | undefined) {
  const out: { cur?: State } = {};
  function Probe() {
    out.cur = useSession(id);
    return null;
  }
  const root = createRoot();
  return { out, root, Probe };
}

describe('useSession', () => {
  beforeEach(() => observe.mockReset());

  it('subscribes, exposes loading then session, and unsubscribes on unmount', async () => {
    const unsub = jest.fn();
    let emit!: (s: Session | null) => void;
    observe.mockImplementation((_id: string, cb: typeof emit) => {
      emit = cb;
      return unsub;
    });
    const { out, root, Probe } = setup('s1');
    await act(async () => root.render(createElement(Probe)));
    expect(observe).toHaveBeenCalledWith('s1', expect.any(Function), expect.any(Function));
    expect(out.cur).toMatchObject({ session: null, loading: true, error: null });

    await act(async () => emit(sess));
    expect(out.cur).toMatchObject({ session: sess, loading: false, error: null });

    expect(unsub).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it('surfaces observer errors', async () => {
    let fail!: (e: Error) => void;
    observe.mockImplementation((_id: string, _cb: unknown, onErr: typeof fail) => {
      fail = onErr;
      return jest.fn();
    });
    const { out, root, Probe } = setup('s1');
    await act(async () => root.render(createElement(Probe)));
    await act(async () => fail(new Error('permission-denied')));
    expect(out.cur?.error?.message).toBe('permission-denied');
    expect(out.cur?.loading).toBe(false);
  });

  it('drops a stale session on error and re-subscribes on retry', async () => {
    const handlers: { cb: (s: Session | null) => void; err: (e: Error) => void }[] = [];
    observe.mockImplementation((_id: string, cb: never, err: never) => {
      handlers.push({ cb, err });
      return jest.fn();
    });
    const { out, root, Probe } = setup('s1');
    await act(async () => root.render(createElement(Probe)));
    await act(async () => handlers[0].cb(sess));
    expect(out.cur?.session).toBe(sess);
    await act(async () => handlers[0].err(new Error('unavailable')));
    expect(out.cur?.session).toBeNull();
    expect(out.cur?.error?.message).toBe('unavailable');
    await act(async () => out.cur?.retry());
    expect(observe).toHaveBeenCalledTimes(2);
    expect(out.cur).toMatchObject({ loading: true, error: null });
  });

  it('does not subscribe without an id', async () => {
    const { out, root, Probe } = setup(undefined);
    await act(async () => root.render(createElement(Probe)));
    expect(observe).not.toHaveBeenCalled();
    expect(out.cur).toMatchObject({ session: null, loading: false, error: null });
  });
});
