import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordServerDate, resetServerClock, serverClockOffset, serverNow } from '../src/services/offline/serverClock.js';

describe('server clock', () => {
  beforeEach(() => {
    resetServerClock();
    localStorage.clear();
  });

  it('converts local time to server time using the Date header', () => {
    const local = Date.parse('2026-11-21T12:00:00Z');
    // The device clock is two minutes behind the server.
    recordServerDate('Sat, 21 Nov 2026 12:02:00 GMT', local);
    expect(serverClockOffset()).toBe(120_500);
    expect(serverNow(local)).toBe(local + 120_500);
  });

  it('ignores missing or invalid headers', () => {
    recordServerDate(undefined);
    recordServerDate('not a date');
    expect(serverClockOffset()).toBe(0);
  });

  it('keeps working when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => recordServerDate('Sat, 21 Nov 2026 12:00:00 GMT', Date.parse('2026-11-21T12:00:00Z'))).not.toThrow();
    expect(serverClockOffset()).toBe(500);
    spy.mockRestore();
  });
});
