// Global error handler — surfaces uncaught exceptions and rejected promises
// as a non-intrusive banner rather than swallowing them silently.

(function () {
  var shown = false;

  function showBanner(msg) {
    if (shown) return;
    shown = true;
    var bar = document.createElement("div");
    bar.setAttribute("role", "alert");
    bar.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:10px 16px;" +
      "background:#c62828;color:#fff;font-size:13px;font-family:inherit;text-align:center;";
    bar.textContent = "Something went wrong: " + msg;
    var close = document.createElement("button");
    close.textContent = "×";
    close.style.cssText =
      "margin-left:12px;background:none;border:none;color:#fff;font-size:18px;cursor:pointer;vertical-align:middle;";
    close.addEventListener("click", function () {
      bar.remove();
      shown = false;
    });
    bar.appendChild(close);
    document.body.appendChild(bar);
  }

  window.onerror = function (message) {
    showBanner(message);
  };

  window.addEventListener("unhandledrejection", function (e) {
    var msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
    showBanner(msg);
  });
})();
