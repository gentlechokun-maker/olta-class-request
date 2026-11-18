import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CATALOG_CACHE_MAX_AGE_MS,
  readCatalogCache,
  writeCatalogCache,
  sameCatalogView,
} from '../public/catalog-cache.js';
import { readPublicData } from '../public/public-data.js';

const api = 'https://script.google.com/macros/s/public-example/exec';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    _map: map,
  };
}

test('catalog cache stores live payloads scoped by apiUrl and rejects invalid or expired entries', () => {
  const storage = memoryStorage();
  const baseTime = Date.parse('2026-11-18T12:00:00+09:00');
  const sample = {
    mode: 'live',
    semester: 2,
    makeupEnabled: true,
    updatedAt: '2026-11-18T03:00:00.000Z',
    classes: [{ id: 'c1', grade: '초3', title: '아톰 1', day: '월', start: '14:00', end: '15:00', room: '4교실', capacity: 6, remaining: 1, review: false }],
    slots: [{ id: 's1', day: '화', start: '17:00', end: '18:00', room: '3교실', grades: ['초3'] }],
  };

  assert.equal(writeCatalogCache(storage, api, 'catalog', sample, { now: baseTime }), true);
  assert.deepEqual(readCatalogCache(storage, api, 'catalog', { now: baseTime + 60000 }), sample);
  assert.equal(readCatalogCache(storage, api + '?other', 'catalog', { now: baseTime }), null);
  assert.equal(
    readCatalogCache(storage, api, 'catalog', { now: baseTime + DEFAULT_CATALOG_CACHE_MAX_AGE_MS + 1 }),
    null,
  );
  assert.equal(readCatalogCache(storage, api, 'catalog', { now: baseTime - 120000 }), null);

  assert.equal(writeCatalogCache(storage, api, 'catalog', { ...sample, mode: 'demo' }, { now: baseTime }), false);
  assert.equal(writeCatalogCache(storage, api, 'year2027', sample, { now: baseTime }), false);
  assert.equal(
    writeCatalogCache(storage, api, 'year2027', { mode: 'live', year: 2027, classes: sample.classes }, { now: baseTime }),
    true,
  );
  assert.equal(readCatalogCache(storage, api, 'year2027', { now: baseTime }).year, 2027);
});

test('catalog cache fails gracefully on corrupted JSON or blocked storage', () => {
  const storage = memoryStorage();
  storage._map.set(`olta:swr:v1:catalog:${api}`, '{broken-json');
  assert.equal(readCatalogCache(storage, api, 'catalog'), null);

  const blocked = {
    getItem() {
      throw Error('SecurityError');
    },
    setItem() {
      throw Error('QuotaExceededError');
    },
  };
  assert.equal(readCatalogCache(blocked, api, 'catalog'), null);
  assert.equal(
    writeCatalogCache(blocked, api, 'catalog', { mode: 'live', classes: [], slots: [] }),
    false,
  );
  assert.equal(readCatalogCache(null, api, 'catalog'), null);
});

test('sameCatalogView ignores timestamp-only refreshes and catches seat or schedule changes', () => {
  const a = {
    mode: 'live',
    semester: 2,
    makeupEnabled: true,
    updatedAt: '2026-11-18T03:00:00.000Z',
    classes: [{ id: 'c1', grade: '초3', title: '아톰 1', day: '월', start: '14:00', end: '15:00', room: '4교실', capacity: 6, remaining: 1, review: false }],
    slots: [],
  };
  const b = { ...a, updatedAt: '2026-11-18T04:00:00.000Z' };
  assert.equal(sameCatalogView(a, b, 'catalog'), true);

  const c = { ...b, classes: [{ ...a.classes[0], remaining: 0 }] };
  assert.equal(sameCatalogView(a, c, 'catalog'), false);

  const y1 = {
    mode: 'live',
    year: 2027,
    updatedAt: '2026-11-18T03:00:00.000Z',
    classes: [{ id: 'y1', grade: '초6', title: '퀀텀 2', day: '수', start: '15:00', end: '16:00', room: '2교실', capacity: 6, remaining: 2, review: false }],
  };
  const y2 = { ...y1, updatedAt: '2026-11-18T04:00:00.000Z' };
  assert.equal(sameCatalogView(y1, y2, 'year2027'), true);
  assert.equal(sameCatalogView(y1, { ...y2, classes: [{ ...y1.classes[0], review: true }] }, 'year2027'), false);
});

test('readPublicData consumes browser head prefetch once without caching subsequent retries', async () => {
  const expected = { mode: 'live', classes: [], slots: [] };
  const retryData = { mode: 'live', classes: [{ id: 'c2' }], slots: [] };
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let networkCalls = 0;
  const mockFetch = async () => {
    networkCalls++;
    return { ok: true, json: async () => retryData };
  };
  globalThis.fetch = mockFetch;
  globalThis.window = {
    __OLTA_PREFETCH__: {
      [`${api}?action=catalog`]: Promise.resolve({ ok: true, json: async () => expected }),
    },
  };
  try {
    const first = await readPublicData(api, { action: 'catalog' }, { fetchImpl: mockFetch });
    assert.equal(first, expected);
    assert.equal(networkCalls, 0);
    assert.equal(globalThis.window.__OLTA_PREFETCH__[`${api}?action=catalog`], undefined);

    const second = await readPublicData(api, { action: 'catalog' }, { fetchImpl: mockFetch });
    assert.equal(second, retryData);
    assert.equal(networkCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
