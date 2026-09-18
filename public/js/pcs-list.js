// Process Check Sheet — list and new-sheet views.
// Loaded after pcs.js (helpers, state) and before the router.

function renderList(root) {
  const all = pcsLoadAll().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const archivedCount = all.filter(pcsIsArchived).length;
  const records = PCS_SHOW_ARCHIVED ? all : all.filter((r) => !pcsIsArchived(r));

  const rows = records
    .map((r) => {
      const flags = pcsOutOfSpecCount(r);
      const pending = pcsPendingApprovalCount(r);
      const archived = pcsIsArchived(r);
      return `
        <tr class="${archived ? "row-locked" : ""}">
          <td>
            <a href="#/sheet/${r.id}">${escapeHtml(r.date || "—")}</a>
            ${archived ? ' <span class="archived-badge">Archived</span>' : ""}
          </td>
          <td>${escapeHtml(r.line || "—")}</td>
          <td>${escapeHtml(r.furnaceNo || "—")}</td>
          <td>${(r.machines || []).length}</td>
          <td>${(r.hourly || []).length}</td>
          <td>${(r.shifts || []).length} / 3</td>
          <td>${flags ? `<span class="flag-badge">${flags} out of spec</span>` : `<span class="ok-badge">In spec</span>`}</td>
          <td>${pending ? `<span class="pending-badge">${pending} pending</span>` : `<span class="ok-badge">Approved</span>`}</td>
          ${pcsCan("action.pcs.sheet.print") ? `<td><a class="btn btn-secondary btn-sm" href="#/print/${r.id}">Print</a></td>` : ""}
        </tr>`;
    })
    .join("");

  root.innerHTML = `
    <p class="breadcrumb"><a href="production-records.html">Production Records</a> / Process Check Sheet</p>
    <h1>Process Check Sheet</h1>
    <p class="subtitle">
      QC FMT 038 · Line — Mando Model Line. Open a day sheet to record and approve
      machines, hourly readings and shift sign-offs.
    </p>

    <div class="btn-row" style="margin-bottom:22px;">
      ${pcsCan("action.pcs.sheet.create") ? '<a class="btn" href="#/new">+ New Day Sheet</a>' : '<span class="muted-xs">You do not have permission to create a day sheet.</span>'}
      ${
        archivedCount
          ? `<button class="btn btn-secondary" id="toggle-archived">
               ${PCS_SHOW_ARCHIVED ? "Hide archived" : `Show archived (${archivedCount})`}
             </button>`
          : ""
      }
    </div>

    ${
      records.length
        ? `<div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Line</th><th>Furnace</th><th>Machines</th>
                  <th>Hourly</th><th>Shifts</th><th>Spec</th><th>Approval</th>
                  ${pcsCan("action.pcs.sheet.print") ? "<th></th>" : ""}
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`
        : `<div class="card"><p>No day sheets yet. Create one to start recording.</p></div>`
    }`;

  root.querySelector("#toggle-archived")?.addEventListener("click", () => {
    PCS_SHOW_ARCHIVED = !PCS_SHOW_ARCHIVED;
    renderList(root);
  });
}

function renderNew(root) {
  const today = new Date().toISOString().slice(0, 10);
  root.innerHTML = `
    <p class="breadcrumb"><a href="#/">Process Check Sheet</a> / New</p>
    <h1>New Day Sheet</h1>
    <p class="subtitle">Header details for the day. Machines, hourly readings and shift sign-offs are all recorded on the sheet itself.</p>
    <div class="card">
      <div class="field-grid" id="daily-form">
        ${PCS_DAILY_FIELDS.map((f) => fieldInputHtml(f, f.key === "date" ? today : "", {})).join("")}
      </div>
      <div id="daily-alert"></div>
      <div class="btn-row" style="margin-top:20px;">
        <button class="btn" id="save-daily">Create Day Sheet</button>
        ${pcsAutoFillButton("new-day", "Auto-fill")}
        <a class="btn btn-secondary" href="#/">Cancel</a>
      </div>
    </div>`;

  const form = document.getElementById("daily-form");

  root.querySelector('[data-autofill="new-day"]')?.addEventListener("click", () => {
    pcsAutoFillForm(form, PCS_DAILY_FIELDS);
  });

  document.getElementById("save-daily").addEventListener("click", () => {
    const entry = readForm(form, PCS_DAILY_FIELDS);
    const result = paintValidation(form, entry, PCS_DAILY_FIELDS);
    document.getElementById("daily-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;
    const record = pcsCreateDaily(entry, PCS_SESSION.userid);
    window.location.hash = `#/sheet/${record.id}`;
  });
}
