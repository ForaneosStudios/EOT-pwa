import { describe, expect, it, vi } from 'vitest';
import { connectLiveUpdates, parseSse } from '../src/services/liveUpdates.js';

vi.mock('../src/services/supabase.js', () => ({ supabase: null }));

const encoder = new TextEncoder();

/** A fetch response whose body yields the given text chunks, then ends. */
function streamResponse(chunks, { ok = true, status = 200 } = {}) {
  const queue = chunks.map((chunk) => encoder.encode(chunk));
  return {
    ok, status,
    body: { getReader: () => ({ read: async () => (queue.length ? { value: queue.shift(), done: false } : { value: undefined, done: true }) }) },
  };
}

describe('SSE parsing', () => {
  it('reads named events with JSON data, skips heartbeats and keeps partial input', () => {
    const { events, rest } = parseSse(':ping\n\nevent:record\ndata:{"bestTimeMs":61000}\n\nevent: leaderboard\ndata: {}\n\nevent:achi');
    expect(events).toEqual([{ type: 'record', data: { bestTimeMs: 61000 } }, { type: 'leaderboard', data: {} }]);
    expect(rest).toBe('event:achi');
    expect(parseSse('event:x\ndata:no-json\n\n').events[0].data).toEqual({ raw: 'no-json' });
    expect(parseSse('event:ready\r\n\r\n').events[0]).toEqual({ type: 'ready', data: {} });
  });
});

describe('live connection', () => {
  it('sends the bearer token, forwards events and resyncs after reconnecting', async () => {
    const onEvent = vi.fn();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(streamResponse(['event:ready\ndata:{}\n\nevent:rec', 'ord\ndata:{"bestTimeMs":5}\n\n']))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(streamResponse(['event:achievements\ndata:{"achId":"a"}\n\n']))
      .mockImplementation(() => new Promise(() => {}));
    const waits = [];
    const stop = connectLiveUpdates({ onEvent, fetchImpl, getToken: async () => 'tok', wait: async (ms) => { waits.push(ms); } });

    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledTimes(3));
    expect(fetchImpl.mock.calls[0][0]).toMatch(/\/live\/me$/);
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tok', Accept: 'text/event-stream' });
    expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual(['record', 'resync', 'achievements']);
    expect(waits.slice(0, 2)).toEqual([2000, 4000]);
    stop();
  });

  it('waits without a session or after a rejected stream and stops cleanly', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(streamResponse([], { ok: false, status: 401 }));
    let tokens = 0;
    const waits = [];
    let stop;
    const getToken = async () => (tokens++ === 0 ? null : 'tok');
    stop = connectLiveUpdates({ onEvent: vi.fn(), fetchImpl, getToken, wait: async (ms) => { waits.push(ms); if (waits.length === 4) stop(); } });
    await vi.waitFor(() => expect(waits.length).toBe(4));
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([2000, 4000, 8000, 16000]);
  });

  it('uses the real timer wait and the Supabase-less token lookup by default', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn();
    const stop = connectLiveUpdates({ onEvent: vi.fn(), fetchImpl });
    await vi.advanceTimersByTimeAsync(2100);
    stop();
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
