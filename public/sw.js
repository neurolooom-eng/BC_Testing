// Service worker — keeps the app usable when the shop-floor wifi drops.
//
// Strategy is network-first with a cache fallback, deliberately: a stale
// app shell that never updates would be worse than an offline gap, and
// this app deploys on every push. The network is tried first, a good
// response is cached on the way past, and the cache only answers when the
// network cannot. Records themselves live in localStorage, which needs no
// network at all — this covers the HTML, CSS and JS around them.

// The deploy workflow replaces "dev" with the build number, so every deploy
// changes this file. The browser then installs the new worker, which
// precaches a fresh, consistent shell and deletes the previous build's
// cache — so offline never serves a mix of two deploys' files.
const CACHE = "bestcast-shell-dev";

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
        // cache: "reload" skips the browser's HTTP cache, so a new deploy
        // precaches the files just published rather than older copies.
        SHELL.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => null))
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

function offlinePage(url) {
  const name = url.pathname.split("/").pop() || "This page";
  const safe = name.replace(/[^\w.-]/g, "");
  // Resolved against the worker's scope, so the link works from any path.
  const sheet = new URL("process-check-sheet.html", self.registration.scope).href;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f4ee;color:#1f2937;margin:0;padding:48px 20px;text-align:center}
h1{font-size:24px;margin:0 0 12px}p{font-size:17px;line-height:1.5;margin:0 auto 24px;max-width:420px}
a{display:inline-block;background:#1f3a8a;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-size:17px;min-height:48px}</style>
</head><body><h1>You are offline</h1>
<p>${safe} has not been opened on this tablet before, so it is not available without a connection. Readings already on the tablet are safe.</p>
<a href="${sheet}">Open the Process Check Sheet</a></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// How long the network gets before a cached copy is served instead. A
// dropped connection fails fast, but a connected-yet-dead one (wifi up, no
// route) can leave fetch hanging for far longer than an operator will wait.
// The network request carries on regardless and refreshes the cache if it
// eventually answers.
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const network = fetch(request).then((response) => {
    if (response && response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
    }
    return response;
  });
  // Keep the worker alive until the network settles, even when the cache
  // has already answered, so a late response still refreshes the cache.
  event.waitUntil(network.catch(() => null));

  event.respondWith(
    new Promise((resolve) => {
      let settled = false;
      const answer = (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(response);
      };

      // Slow network: answer from the cache if it has this exact request.
      // Otherwise keep waiting — a slow page beats no page.
      const timer = setTimeout(() => {
        caches.match(request).then((cached) => {
          if (cached) answer(cached);
        });
      }, NETWORK_TIMEOUT_MS);

      network.then(answer, () =>
        caches.match(request).then((cached) => {
          if (cached) return answer(cached);
          // A navigation with nothing cached for that exact URL gets a
          // short page saying so, with a way back to the check sheet —
          // rather than a browser error, or another page under this URL.
          if (request.mode === "navigate") return answer(offlinePage(url));
          answer(Response.error());
        })
      );
    })
  );
});
