const CACHE_NAME = 'deelauto-nijverhoek-v4'
const STATIC_ASSETS = [
	'/manifest.json',
	'/offline',
	'/icons/web-app-manifest-192x192.png',
	'/icons/web-app-manifest-512x512.png',
]

// Install event - cache resources
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS)
		}),
	)
	self.skipWaiting()
})

// Fetch event - keep pages fresh, cache static assets
self.addEventListener('fetch', (event) => {
	const { request } = event

	// Always try network first for document requests, so we don't
	// keep serving stale HTML that points to old CSS chunk filenames.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const responseClone = response.clone()
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, responseClone)
					})
					return response
				})
				.catch(async () => {
					const cachedPage = await caches.match(request)
					if (cachedPage) {
						return cachedPage
					}
					return caches.match('/offline')
				}),
		)
		return
	}

	// Cache-first for static assets for faster repeat loads.
	if (
		request.method === 'GET' &&
		(request.url.includes('/_next/static/') ||
			request.destination === 'style' ||
			request.destination === 'script' ||
			request.destination === 'image')
	) {
		event.respondWith(
			caches.match(request).then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse
				}

				return fetch(request).then((networkResponse) => {
					const responseClone = networkResponse.clone()
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, responseClone)
					})
					return networkResponse
				})
			}),
		)
	}
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						return caches.delete(cacheName)
					}
				}),
			)
		}),
	)
	self.clients.claim()
})
