// Brand mark fallback (BUG-004).
//
// The logo asset is supplied separately from the code, so it can legitimately
// be absent. Without this, a missing file leaves a broken image — an empty
// circle that reads as a rendering fault. Any element marked
// data-brand-mark degrades to a monogram instead.

function applyBrandFallback(img) {
  if (!img.parentNode) return;
  const mark = document.createElement("span");
  mark.className = `${img.className} logo-fallback`.trim();
  mark.textContent = "B";
  mark.setAttribute("role", "img");
  mark.setAttribute("aria-label", img.alt || "Bestcast");
  img.replaceWith(mark);
}

function initBrandMarks(root) {
  (root || document).querySelectorAll("img[data-brand-mark]").forEach((img) => {
    img.addEventListener("error", () => applyBrandFallback(img));
    // The error may already have fired before this listener was attached.
    if (img.complete && img.naturalWidth === 0) applyBrandFallback(img);
  });
}

document.addEventListener("DOMContentLoaded", () => initBrandMarks());
