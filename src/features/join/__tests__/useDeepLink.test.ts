import { parseJoinLink, joinPathForLink, JOIN_LINK_HOST } from '../useDeepLink';
import { resolveJoinCode, joinErrorMessage } from '../joinFlow';
import { findSessionByCode } from '../../../backend/sessionService';
import type { Session } from '../../../core/types';

jest.mock('../../../backend/sessionService', () => ({
  findSessionByCode: jest.fn(),
  joinSession: jest.fn(),
}));

const find = findSessionByCode as unknown as jest.Mock;

describe('parseJoinLink', () => {
  it('extracts the code from the custom scheme', () => {
    expect(parseJoinLink('swipeeats://join?code=ABC123')).toBe('ABC123');
  });
  it('extracts the code from the universal link', () => {
    expect(parseJoinLink(`https://${JOIN_LINK_HOST}/join/ABC123`)).toBe('ABC123');
    expect(parseJoinLink(`https://${JOIN_LINK_HOST}/join/abc123/`)).toBe('ABC123');
  });
  it('accepts a bare code and normalizes case/whitespace', () => {
    expect(parseJoinLink(' abc234 ')).toBe('ABC234');
  });
  it('returns null on junk / missing', () => {
    expect(parseJoinLink('')).toBeNull();
    expect(parseJoinLink('hello world')).toBeNull();
    expect(parseJoinLink('swipeeats://join')).toBeNull();
    expect(parseJoinLink('swipeeats://join?code=')).toBeNull();
    expect(parseJoinLink('swipeeats://join?code=ab')).toBeNull();
    expect(parseJoinLink('https://evil.example/join/ABC123')).toBeNull();
    expect(parseJoinLink('https://other.com/foo')).toBeNull();
    expect(parseJoinLink(undefined as unknown as string)).toBeNull();
  });
  it('joinPathForLink maps a link to the join route, else null', () => {
    expect(joinPathForLink('swipeeats://join?code=ABC123')).toBe('/join?code=ABC123');
    expect(joinPathForLink('junk')).toBeNull();
  });
});

const stub = (over: Partial<Session> = {}): Session => ({
  id: 's1',
  code: 'ABC123',
  hostId: '',
  status: 'waiting',
  mode: 'both',
  filters: { unit: 'metric', cuisines: [], openNow: false, anchor: { lat: 0, lng: 0 } },
  participants: {},
  candidates: [],
  swipes: {},
  ...over,
});

describe('resolveJoinCode (wrong / expired code -> readable error, no crash)', () => {
  beforeEach(() => find.mockReset());

  it('rejects a malformed code without hitting the backend', async () => {
    const r = await resolveJoinCode('!!');
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/code/i) });
    expect(find).not.toHaveBeenCalled();
  });
  it('maps a not-found code to a readable error', async () => {
    find.mockResolvedValue(null);
    const r = await resolveJoinCode('ABC123');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/couldn.t find|not found|check the code/i);
  });
  it('maps a finished session to a readable error', async () => {
    find.mockResolvedValue(stub({ status: 'finished' }));
    const r = await resolveJoinCode('ABC123');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/ended|finished/i);
  });
  it('maps a cancelled session to a readable error', async () => {
    find.mockResolvedValue(stub({ status: 'cancelled' }));
    const r = await resolveJoinCode('ABC123');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/cancel/i);
  });
  it('maps a thrown backend error to a readable error instead of throwing', async () => {
    find.mockRejectedValue(new Error('network down'));
    const r = await resolveJoinCode('ABC123');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/connection|try again/i);
  });
  it('resolves a good code to id + code only (stub data is not exposed)', async () => {
    find.mockResolvedValue(stub());
    const r = await resolveJoinCode(' abc123 ');
    expect(r).toEqual({ ok: true, sessionId: 's1', code: 'ABC123' });
    expect(find).toHaveBeenCalledWith('ABC123');
  });
  it('joinErrorMessage never returns empty text', () => {
    expect(joinErrorMessage(new Error('x'))).toBeTruthy();
    expect(joinErrorMessage('weird')).toBeTruthy();
  });
});

describe('parseJoinLink host strictness', () => {
  it('treats the host dots literally', () => {
    expect(parseJoinLink(`https://${JOIN_LINK_HOST.replace('.', 'X')}/join/ABC123`)).toBeNull();
  });
});
