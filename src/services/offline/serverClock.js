// Estimates the difference between this device's clock and the API server's clock from the
// Date header of API responses, so "when the user made this edit" can be sent in server time
// (X-Client-Intent-At). Devices with a wrong clock still order their edits correctly.

const STORAGE_KEY = 'eot:server-clock-offset';
// The Date header has one-second resolution and is truncated, so on average it is 0.5 s behind.
const DATE_HEADER_CORRECTION_MS = 500;

function readStoredOffset() {
  try {
    const value = Number(globalThis.localStorage?.getItem(STORAGE_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0; // Storage blocked (private mode, policies): assume clocks agree.
  }
}

let offsetMs = readStoredOffset();

export function recordServerDate(dateHeader, localNow = Date.now()) {
  if (!dateHeader) return;
  const serverTime = Date.parse(dateHeader);
  if (!Number.isFinite(serverTime)) return;
  offsetMs = serverTime + DATE_HEADER_CORRECTION_MS - localNow;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, String(offsetMs));
  } catch {
    // Keeping the offset in memory is enough for this session.
  }
}

export const serverNow = (localNow = Date.now()) => localNow + offsetMs;

export const serverClockOffset = () => offsetMs;

export function resetServerClock() {
  offsetMs = 0;
}
