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
  chevron: '<svg class="nav-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
};

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
      <img class="brand-logo" src="logo.svg" alt="Bestcast logo">
      <span class="brand-name">Bestcast</span>
    </a>

    <nav class="main-nav">
      <a class="${cls("overview")}" href="dashboard.html">
        ${NAV_ICONS.overview} Overview
      </a>
      <a class="${cls("production-records")}" href="production-records.html">
        ${NAV_ICONS.production} Production Records
      </a>
      <a class="${cls("reports")}" href="#" title="Coming soon">
        ${NAV_ICONS.reports} Reports
      </a>
      <div class="nav-item-wrap" id="team-menu-wrap">
        <button class="${cls("team")}" id="team-menu-trigger" type="button">
          ${NAV_ICONS.team} Team ${NAV_ICONS.chevron}
        </button>
        <div class="nav-dropdown" id="team-dropdown">
          <a href="#" title="Coming soon">Roster</a>
        </div>
      </div>
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
        ${DEV_PAGE_USERS.includes(session.userid) ? '<a href="dev.html">Dev Page</a>' : ""}
        <button id="logout">Log out</button>
      </div>
    </div>
  `;
  document.body.insertBefore(header, document.body.firstChild);

  // --- menus ---
  const userTrigger = document.getElementById("user-menu-trigger");
  const userDropdown = document.getElementById("user-dropdown");
  const teamWrap = document.getElementById("team-menu-wrap");
  const teamDropdown = document.getElementById("team-dropdown");

  function closeAllMenus() {
    userTrigger.classList.remove("open");
    userDropdown.classList.remove("open");
    teamWrap.classList.remove("open");
    teamDropdown.classList.remove("open");
  }

  function toggleMenu(wrap, dropdown) {
    return (e) => {
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains("open");
      closeAllMenus();
      if (willOpen) {
        wrap.classList.add("open");
        dropdown.classList.add("open");
      }
    };
  }

  userTrigger.addEventListener("click", toggleMenu(userTrigger, userDropdown));
  teamWrap.addEventListener("click", toggleMenu(teamWrap, teamDropdown));
  document.addEventListener("click", closeAllMenus);

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
