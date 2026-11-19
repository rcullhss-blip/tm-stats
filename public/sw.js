// TM Stats service worker. Deliberately simple: everything comes from the
// network as normal. When there is no signal, a page request gets a short
// offline note instead of the browser's error, so the installed app never
// shows a dead screen on the course.
const OFFLINE = '/offline.html'

self.addEventListener('install', event => {
  event.waitUntil(caches.open('tmstats-offline-v1').then(c => c.add(OFFLINE)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)))
})
