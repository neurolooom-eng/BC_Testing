// Service worker — keeps the app usable when the shop-floor wifi drops.
//
// Strategy is network-first with a cache fallback, deliberately: a stale
// app shell that never updates would be worse than an offline gap, and
// this app deploys on every push. The network is tried first, a good
// response is cached on the way past, and the cache only answers when the
// network cannot. Records themselves live in localStorage, which needs no
// network at all — this covers the HTML, CSS and JS around them.

const CACHE = "bestcast-shell-v1";

// The pages an operator can plausibly be on when the connection goes, plus
// everything needed to render them.
const SHELL = [
  "./",
  "index.html",
  "login.html",
  "dashboard.html",
  "production-records.html",
  "process-check-sheet.html",
  "css/app.css",
  "css/forms.css",
  "css/pcs.css",
  "css/auth.css",
  "css/templates.css",
  "js/build-info.js",
  "js/footer.js",
  "js/brand.js",
  "js/error-handler.js",
  "js/temp-local-auth.js",
  "js/rbac.js",
  "js/util.js",
  "js/quick-record.js",
  "js/topbar.js",
  "js/auth.js",
  "js/pcs-spec.js",
  "js/pcs-store.js",
  "js/pcs-demo.js",
  "js/pcs-print.js",
  "js/pcs.js",
  "js/pcs-list.js",
  "js/pcs-sheet.js",
  "js/pcs-hourly.js",
  "js/pcs-operator.js",
  "js/pcs-handoff.js",
  "js/pcs-shift.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // One missing file must not fail the whole install, so each is added
      // on its own and a failure is skipped.
      Promise.all(
        SHELL.map((url) => cache.add(url).catch(() => null))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // A navigation with nothing cached for that exact URL still gets
          // the shell, so the tablet shows the app rather than a browser
          // error page.
          if (request.mode === "navigate") return caches.match("process-check-sheet.html");
          return Response.error();
        })
      )
  );
});
