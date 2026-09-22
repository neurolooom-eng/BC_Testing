// Shared utility functions used across all modules.

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------- toast -------------------------------------------------------
// A full-width confirmation bar, sized to be read at arm's length from a
// tablet propped beside a machine rather than at a desk.

var _toastTimer = null;

function showToast(message, kind) {
  var existing = document.getElementById("app-toast");
  if (existing) existing.remove();
  if (_toastTimer) clearTimeout(_toastTimer);

  var toast = el(
    '<div id="app-toast" class="app-toast toast-' +
      (kind || "ok") +
      '" role="status" aria-live="polite"><span class="toast-text"></span></div>'
  );
  toast.querySelector(".toast-text").textContent = message;
  document.body.appendChild(toast);

  // Next frame, so the entry transition actually runs.
  requestAnimationFrame(function () {
    toast.classList.add("visible");
  });

  _toastTimer = setTimeout(function () {
    toast.classList.remove("visible");
    setTimeout(function () {
      toast.remove();
    }, 250);
  }, kind === "error" ? 5000 : 2600);
}

// ---------- modal accessibility -----------------------------------------
// trapFocus(backdrop) keeps Tab cycling inside a modal and focuses the
// first interactive element. releaseFocus() restores focus to wherever it
// was before the modal opened. Call these from every modal open/close.

var _focusTrapData = new WeakMap();

function trapFocus(backdrop) {
  var prev = document.activeElement;
  _focusTrapData.set(backdrop, { prev: prev });

  var focusable = backdrop.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length) focusable[0].focus();

  var handler = function (e) {
    if (e.key !== "Tab") return;
    var els = backdrop.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    );
    if (!els.length) return;
    var first = els[0];
    var last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  backdrop.addEventListener("keydown", handler);
  _focusTrapData.get(backdrop).handler = handler;
}

function releaseFocus(backdrop) {
  var data = _focusTrapData.get(backdrop);
  if (!data) return;
  if (data.handler) backdrop.removeEventListener("keydown", data.handler);
  if (data.prev && data.prev.focus) data.prev.focus();
  _focusTrapData.delete(backdrop);
}
