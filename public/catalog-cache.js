export const DEFAULT_CATALOG_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function catalogCacheKey(kind, apiUrl) {
  return `olta:swr:v1:${kind}:${apiUrl}`;
}

export function isValidCatalogPayload(data, kind) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.mode !== 'live' || !Array.isArray(data.classes)) return false;
  if (kind === 'catalog') return Array.isArray(data.slots);
  if (kind === 'year2027') return data.year === 2027;
  return false;
}

export function readCatalogCache(
  storage,
  apiUrl,
  kind,
  { now = Date.now(), maxAgeMs = DEFAULT_CATALOG_CACHE_MAX_AGE_MS } = {},
) {
  if (!storage || !apiUrl) return null;
  try {
    const raw = storage.getItem(catalogCacheKey(kind, apiUrl));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const savedAt = Number(parsed.savedAt);
    if (!Number.isFinite(savedAt) || savedAt > now + 60000 || now - savedAt > maxAgeMs) return null;
    return isValidCatalogPayload(parsed.data, kind) ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeCatalogCache(storage, apiUrl, kind, data, { now = Date.now() } = {}) {
  if (!storage || !apiUrl || !isValidCatalogPayload(data, kind)) return false;
  try {
    storage.setItem(catalogCacheKey(kind, apiUrl), JSON.stringify({ savedAt: now, data }));
    return true;
  } catch {
    return false;
  }
}

function catalogViewProjection(data, kind) {
  if (!data || typeof data !== 'object') return null;
  if (kind === 'year2027') {
    return {
      year: data.year,
      retentionDays: data.retentionDays,
      privacyContact: data.privacyContact,
      classes: (data.classes || []).map((c) => ({
        id: c.id,
        grade: c.grade,
        grades: c.grades,
        title: c.title,
        day: c.day,
        start: c.start,
        end: c.end,
        room: c.room,
        capacity: c.capacity,
        remaining: c.remaining,
        review: Boolean(c.review),
        theory: c.theory || null,
        bundle: Boolean(c.bundle),
        days: c.days || null,
        sessions: c.sessions || null,
      })),
    };
  }
  return {
    semester: data.semester,
    makeupEnabled: Boolean(data.makeupEnabled),
    openingYear: data.openingYear || null,
    retentionDays: data.retentionDays,
    privacyContact: data.privacyContact,
    classes: (data.classes || []).map((c) => ({
      id: c.id,
      grade: c.grade,
      title: c.title,
      lesson: c.lesson || '',
      day: c.day,
      start: c.start,
      end: c.end,
      room: c.room,
      capacity: c.capacity,
      remaining: c.remaining,
      review: Boolean(c.review),
    })),
    slots: (data.slots || []).map((s) => ({
      id: s.id,
      day: s.day,
      start: s.start,
      end: s.end,
      room: s.room,
      grades: s.grades,
    })),
  };
}

export function sameCatalogView(a, b, kind) {
  if (!a || !b) return false;
  try {
    return JSON.stringify(catalogViewProjection(a, kind)) === JSON.stringify(catalogViewProjection(b, kind));
  } catch {
    return false;
  }
}
