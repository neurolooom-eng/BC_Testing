// Renders window.BUILD_INFO (see build-info.js) into every .build-footer
// element on the page.
(function () {
  const info = window.BUILD_INFO || { version: "dev", buildNumber: "-", buildDate: "unbuilt (local)" };
  document.querySelectorAll(".build-footer").forEach((el) => {
    el.textContent = `v${info.version} · Build #${info.buildNumber} · ${info.buildDate}`;
  });
})();
