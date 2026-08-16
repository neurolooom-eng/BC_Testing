// Renders the shared top bar and wires up its menus, theme toggle, and
// session gating. Include after temp-local-auth.js, then call:
//   renderTopbar("overview" | "production-records" | "reports" | "team")
//
// Returns the current session, or redirects to login.html if there isn't one.

const NAV_ICONS = {
  overview:
    '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>',
  production:
    '<svg viewBox="0 0 24 24"><path d="M9 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M14 9h4M14 13h4M14 17h4"/></svg>',
  reports:
    '<svg viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/></svg>',
  team:
    '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 8.2a3.2 3.2 0 1 1 3.2 3.2"/><path d="M15.5 14.2c2.7.3 4.9 2.4 5.4 5.6"/></svg>',
  config:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 5 8.9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.5a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
  chevron: '<svg class="nav-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
};

// Nav entries, each tied to the page permission that reveals it. Where the
// access configuration is unavailable (a page that does not load rbac.js),
// everything is shown — the bar must never be the thing that breaks.
const NAV_ITEMS = [
  { key: "overview", page: "page.overview", label: "Overview", href: "dashboard.html", icon: "overview" },
  { key: "production-records", page: "page.production_records", label: "Production Records", href: "production-records.html", icon: "production" },
  { key: "reports", page: "page.reports", label: "Reports", href: "#", icon: "reports", comingSoon: true },
  {
    key: "team",
    page: "page.team",
    label: "Team",
    icon: "team",
    children: [{ page: "page.roster", label: "Roster", href: "#", comingSoon: true }],
  },
  { key: "configuration", page: "page.configuration", label: "Configuration", href: "configuration.html", icon: "config" },
];

function navCanView(session, pageId) {
  if (typeof rbacCanViewPage !== "function") return true;
  return rbacCanViewPage(session.userid, pageId);
}

function renderTopbar(activeKey) {
  const session = tempGetSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  const cls = (key) => "nav-item" + (key === activeKey ? " active" : "");
  const initial = session.fullName.charAt(0).toUpperCase();

  const header = document.createElement("header");
  header.className = "topbar";
  header.innerHTML = `
    <a class="brand" href="dashboard.html">
      <img class="brand-logo" src="logo.svg" alt="Bestcast logo" data-brand-mark>
      <span class="brand-name">Bestcast</span>
    </a>

    <nav class="main-nav">
      ${NAV_ITEMS.filter((item) => navCanView(session, item.page))
        .map((item) => {
          const icon = NAV_ICONS[item.icon];
          if (!item.children) {
            const title = item.comingSoon ? ' title="Coming soon"' : "";
            return `<a class="${cls(item.key)}" href="${item.href}"${title}>${icon} ${item.label}</a>`;
          }
          const children = item.children.filter((c) => navCanView(session, c.page));
          // A menu with nothing left in it would be a dead end.
          if (!children.length) return "";
          return `
            <div class="nav-item-wrap" id="team-menu-wrap">
              <button class="${cls(item.key)}" id="team-menu-trigger" type="button">
                ${icon} ${item.label} ${NAV_ICONS.chevron}
              </button>
              <div class="nav-dropdown" id="team-dropdown">
                ${children
                  .map((c) => `<a href="${c.href}"${c.comingSoon ? ' title="Coming soon"' : ""}>${c.label}</a>`)
                  .join("")}
              </div>
            </div>`;
        })
        .join("")}
    </nav>

    <div class="header-actions">
      <button class="theme-toggle" id="theme-toggle" type="button"
              title="Toggle light/dark theme" aria-label="Toggle light and dark theme">
        <svg id="icon-moon" viewBox="0 0 24 24"><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5Z"/></svg>
        <svg id="icon-sun" viewBox="0 0 24 24" style="display:none;"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.5 12h3M18.5 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>
      </button>
      <div class="user" id="user-menu-trigger">
        <div class="avatar">${initial}</div>
        <span class="user-name">${session.fullName}</span>
        <svg class="user-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="user-dropdown" id="user-dropdown">
        ${navCanView(session, "page.dev") ? '<a href="dev.html">Dev Page</a>' : ""}
        <button id="logout">Log out</button>
      </div>
    </div>
  `;
  document.body.insertBefore(header, document.body.firstChild);

  // The bar is built here, which may be after brand.js has already run its
  // DOMContentLoaded pass, so wire this header's mark up explicitly.
  if (typeof initBrandMarks === "function") initBrandMarks(header);

  // --- menus ---
  const userTrigger = document.getElementById("user-menu-trigger");
  const userDropdown = document.getElementById("user-dropdown");
  const teamWrap = document.getElementById("team-menu-wrap");
  const teamDropdown = document.getElementById("team-dropdown");

  // The Team menu is absent when the user may not view anything inside it.
  function closeAllMenus() {
    userTrigger.classList.remove("open");
    userDropdown.classList.remove("open");
    if (teamWrap) teamWrap.classList.remove("open");
    if (teamDropdown) teamDropdown.classList.remove("open");
  }

  // .nav-dropdown is position:fixed (it has to escape the wrapping bar's
  // stacking), so its coordinates come from the trigger's viewport rect.
  function placeNavDropdown() {
    const trigger = document.getElementById("team-menu-trigger");
    if (!trigger || !teamDropdown) return;
    const rect = trigger.getBoundingClientRect();
    teamDropdown.style.top = `${rect.bottom + 6}px`;
    const width = teamDropdown.offsetWidth || 160;
    const maxLeft = window.innerWidth - width - 12;
    teamDropdown.style.left = `${Math.max(12, Math.min(rect.left, maxLeft))}px`;
  }

  function toggleMenu(wrap, dropdown, onOpen) {
    return (e) => {
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains("open");
      closeAllMenus();
      if (willOpen) {
        wrap.classList.add("open");
        dropdown.classList.add("open");
        if (onOpen) onOpen();
      }
    };
  }

  userTrigger.addEventListener("click", toggleMenu(userTrigger, userDropdown));
  if (teamWrap && teamDropdown) {
    teamWrap.addEventListener("click", toggleMenu(teamWrap, teamDropdown, placeNavDropdown));
  }
  document.addEventListener("click", closeAllMenus);

  // A fixed dropdown doesn't follow its trigger, so close it if the page
  // moves underneath it.
  window.addEventListener("resize", closeAllMenus);
  window.addEventListener("scroll", closeAllMenus, { passive: true });
  header.querySelector(".main-nav").addEventListener("scroll", closeAllMenus, { passive: true });

  document.getElementById("logout").addEventListener("click", () => {
    tempClearSession();
    window.location.href = "login.html";
  });

  // --- theme ---
  const THEME_KEY = "bestcast_theme";
  const iconMoon = document.getElementById("icon-moon");
  const iconSun = document.getElementById("icon-sun");

  function applyTheme(theme) {
    document.body.classList.toggle("light-theme", theme === "light");
    iconMoon.style.display = theme === "light" ? "none" : "block";
    iconSun.style.display = theme === "light" ? "block" : "none";
  }

  applyTheme(localStorage.getItem(THEME_KEY) || "dark");

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.body.classList.contains("light-theme") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  return session;
}
