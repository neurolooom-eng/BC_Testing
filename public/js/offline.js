// Registers the service worker that keeps the app usable offline.
//
// Service workers need a secure context, so this is a no-op on plain http
// (other than localhost) and in browsers without support — the app works
// exactly as before, just without the offline fallback.

(function () {
  if (!("serviceWorker" in navigator)) return;

  var secure =
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (!secure) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (err) {
      // Not fatal — the app runs online regardless.
      console.warn("Offline support unavailable:", err);
    });
  });
})();
