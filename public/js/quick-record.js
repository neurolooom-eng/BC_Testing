// Quick Record — the shortest path from signing in to recording a reading.
//
// An operator signs in to do one thing: put this hour's readings on the
// sheet. Reaching that through Overview → Production Records → Process
// Check Sheet → pick the day is four taps of pure navigation, on a tablet,
// with gloves on. This module finds the sheet they want and offers it
// directly.
//
// Self-contained on purpose: it runs on login.html and dashboard.html,
// neither of which loads the PCS modules, so it reads storage itself.

var QR_RECORDS_KEY = "bestcast_pcs_records";

// The production day starts at 6:30am and runs to 6:00am the next morning,
// so before 6:30 the sheet still being filled is yesterday's.
var QR_DAY_START_MIN = 6 * 60 + 30;

function qrProductionDate(now) {
  var d = new Date(now || Date.now());
  if (d.getHours() * 60 + d.getMinutes() < QR_DAY_START_MIN) {
    d.setDate(d.getDate() - 1);
  }
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

function qrLoadRecords() {
  try {
    var raw = localStorage.getItem(QR_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function qrOpenRecords() {
  return qrLoadRecords().filter(function (r) {
    return r && r.id && !r.archivedAt;
  });
}

// Every open sheet for the current production day. A tablet can hold more
// than one — one per line or furnace — so callers must not assume a single
// answer.
function qrTodaysSheets() {
  var today = qrProductionDate();
  return qrOpenRecords().filter(function (r) {
    return r.date === today;
  });
}

// The most recent open sheet on any day, offered on the dashboard when
// nothing is open for today so a day that rolled over can still resume.
function qrMostRecentSheet() {
  var records = qrOpenRecords();
  if (!records.length) return null;
  records.sort(function (a, b) {
    return String(a.date || "").localeCompare(String(b.date || ""));
  });
  return records[records.length - 1];
}

function qrSheetHref(record) {
  return "process-check-sheet.html#/sheet/" + record.id;
}

// A line user is someone whose job on this system is recording readings:
// they may record, but they do not administer. Those are the people worth
// dropping straight onto the sheet; everyone else lands on the dashboard.
function qrIsLineUser(session) {
  if (typeof rbacCanDo !== "function" || typeof rbacCanViewPage !== "function") return false;
  return (
    rbacCanDo(session.userid, "action.pcs.hourly.record") &&
    !rbacCanViewPage(session.userid, "page.configuration")
  );
}

// Called right after a successful sign-in. Returns the page to land on.
//
// Only an unambiguous sheet is worth skipping the dashboard for: exactly one
// open sheet for today. With two or more (different lines or furnaces), a
// silent pick could put readings on the wrong furnace's sheet; with none,
// an older sheet is not "the current one" either. Both go to the dashboard,
// where the cards name the line and furnace and the operator chooses.
function qrLandingPage(session) {
  if (!qrIsLineUser(session)) return "dashboard.html";
  var todays = qrTodaysSheets();
  return todays.length === 1 ? qrSheetHref(todays[0]) : "dashboard.html";
}

function qrCard(record, tag) {
  var card = document.createElement("a");
  card.className = "card quick-card";
  card.href = qrSheetHref(record);
  card.innerHTML =
    '<span class="quick-tag">' +
    esc(tag) +
    "</span>" +
    "<h2>Record readings</h2>" +
    '<p class="quick-line">' +
    esc(record.date || "") +
    " · Line " +
    esc(record.line || "—") +
    " · Furnace " +
    esc(record.furnaceNo || "—") +
    "</p>" +
    '<p class="quick-go">Open the day sheet →</p>';
  return card;
}

// Renders the resume cards at the top of the dashboard. Shown to everyone
// who can record — a supervisor wants the same shortcut, they just are not
// redirected into it. One card per open sheet today, so the line and
// furnace are always chosen, never guessed; otherwise the most recent sheet.
function qrRenderCard(mount, session) {
  if (!mount) return;
  if (typeof rbacCanDo === "function" && !rbacCanDo(session.userid, "action.pcs.hourly.record")) return;

  var todays = qrTodaysSheets();
  if (todays.length) {
    todays.forEach(function (r) {
      mount.appendChild(qrCard(r, "Today"));
    });
  } else {
    var recent = qrMostRecentSheet();
    if (!recent) return;
    mount.appendChild(qrCard(recent, "Most recent"));
  }

  // Clear the inline display:none so the .cards grid layout applies.
  mount.style.display = "";
}
