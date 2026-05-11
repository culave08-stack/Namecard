// public/sw.js — minimal offline support for namecard scanner
//
// Strategies:
//   - Next static assets (/_next/static/**)       : cache-first (immutable)
//   - Supabase Storage (card images)              : cache-first, keyed by path
//                                                   only (drops signed-URL token)
//   - Supabase REST GET (cards data)              : network-first w/ cache
//                                                   fallback. CRUD-heavy data
//                                                   must show fresh state right
//                                                   after save/update/delete;
//                                                   cache only covers offline.
//   - HTML navigations                            : network-first, cache fallback
//   - Everything else                             : network-only
//
// Writes (POST/PATCH/DELETE) and /api/scan always go to the network.

const VERSION = 'v2';
const PRECACHE = `precache-${VERSION}`;
const STATIC = `static-${VERSION}`;
const STORAGE = `storage-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const NAV = `nav-${VERSION}`;

const KNOWN_CACHES = new Set([PRECACHE, STATIC, STORAGE, RUNTIME, NAV]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      cache.addAll(['/manifest.json', '/icon.svg']).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !KNOWN_CACHES.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isSupabaseRest(url) {
  return url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/');
}

function isSupabaseStorage(url) {
  return url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/');
}

function isNextStatic(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');
}

// Build a stable cache key for signed Storage URLs by dropping the token.
function storageCacheKey(req) {
  const u = new URL(req.url);
  u.search = '';
  return new Request(u.toString(), { method: 'GET' });
}

async function cacheFirst(req, cacheName, keyReq) {
  const cache = await caches.open(cacheName);
  const key = keyReq ?? req;
  const cached = await cache.match(key);
  if (cached) return cached;
  const resp = await fetch(req);
  if (resp && resp.ok) {
    cache.put(key, resp.clone()).catch(() => {});
  }
  return resp;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) {
      cache.put(req, resp.clone()).catch(() => {});
    }
    return resp;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((resp) => {
      if (resp && resp.ok) cache.put(req, resp.clone()).catch(() => {});
      return resp;
    })
    .catch(() => undefined);
  if (cached) {
    // Update in background, return cached immediately
    networkPromise.catch(() => {});
    return cached;
  }
  const fresh = await networkPromise;
  if (fresh) return fresh;
  throw new Error('No cache and network failed');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never cache writes
  const url = new URL(req.url);

  // Never cache the AI scan endpoint
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/scan')) return;

  // Next.js immutable static bundles
  if (isNextStatic(url)) {
    event.respondWith(cacheFirst(req, STATIC));
    return;
  }

  // Card images from Supabase Storage (drop signed-URL token from key)
  if (isSupabaseStorage(url)) {
    event.respondWith(cacheFirst(req, STORAGE, storageCacheKey(req)));
    return;
  }

  // Card data from Supabase REST (GET only — POST/PATCH/DELETE already excluded above)
  if (isSupabaseRest(url)) {
    event.respondWith(networkFirst(req, RUNTIME));
    return;
  }

  // HTML navigations
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req, NAV));
    return;
  }

  // Everything else: network-only (default browser behavior)
});
