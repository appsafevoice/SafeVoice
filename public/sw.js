const CACHE_NAME = "safevoice-shell-v1"
const APP_SHELL = ["/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-icon.png", "/images/safe-voice-logo.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  if (!event.request.url.startsWith(self.location.origin)) return

  const requestUrl = new URL(event.request.url)
  const isStaticAsset =
    APP_SHELL.includes(requestUrl.pathname) || /\.(png|svg|jpg|jpeg|webp|json)$/i.test(requestUrl.pathname)

  if (!isStaticAsset) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          const clonedResponse = response.clone()
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clonedResponse))
            .catch(() => undefined)

          return response
        })
        .catch(() => caches.match("/icon-192.png"))
    }),
  )
})
