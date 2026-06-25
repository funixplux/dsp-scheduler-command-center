const shiftHours = 10;
const storageKey = "dsp-scheduler-state-v2";

const daySeed = [
  { key: "sun", label: "Sun 6/22", full: "Sunday, Jun 22", routes: 42 },
  { key: "mon", label: "Mon 6/23", full: "Monday, Jun 23", routes: 44 },
  { key: "tue", label: "Tue 6/24", full: "Tuesday, Jun 24", routes: 46 },
  { key: "wed", label: "Wed 6/25", full: "Wednesday, Jun 25", routes: 48 },
  { key: "thu", label: "Thu 6/26", full: "Thursday, Jun 26", routes: 46 },
  { key: "fri", label: "Fri 6/27", full: "Friday, Jun 27", routes: 44 },
  { key: "sat", label: "Sat 6/28", full: "Saturday, Jun 28", routes: 42 },
];

const driversSeed = [
  { name: "Alexander Ghazi", max: 40, stepVan: true, edv: true, nursery: false, status: "active", timeOff: [] },
  { name: "Abdul Sesay", max: 30, stepVan: true, edv: false, nursery: false, status: "active", timeOff: [] },
  { name: "Andrew Appiah", max: 20, stepVan: false, edv: true, nursery: true, status: "active", timeOff: [] },
  { name: "Michael Johnson", max: 40, stepVan: true, edv: false, nursery: false, status: "active", timeOff: [] },
  { name: "David Mensah", max: 40, stepVan: false, edv: true, nursery: false, status: "active", timeOff: [] },
  { name: "James Williams", max: 30, stepVan: true, edv: false, nursery: false, status: "active", timeOff: [] },
  { name: "Kwame Asante", max: 40, stepVan: true, edv: true, nursery: false, status: "active", timeOff: [] },
  { name: "Samuel Boateng", max: 20, stepVan: false, edv: true, nursery: true, status: "active", timeOff: [] },
  { name: "Emmanuel Okoro", max: 30, stepVan: true, edv: false, nursery: false, status: "active", timeOff: [] },
  { name: "Daniel Quaye", max: 40, stepVan: true, edv: true, nursery: false, status: "active", timeOff: [] },
  { name: "Isaac Mensah", max: 30, stepVan: false, edv: true, nursery: false, status: "active", timeOff: [] },
  { name: "Jeffrey Brown", max: 20, stepVan: true, edv: false, nursery: false, status: "active", timeOff: [] },
  { name: "Patrick Osei", max: 40, stepVan: true, edv: true, nursery: false, status: "active", timeOff: [] },
  { name: "Richard Addo", max: 20, stepVan: false, edv: true, nursery: true, status: "active", timeOff: [] },
  { name: "Martin Abena", max: 20, stepVan: true, edv: true, nursery: false, status: "active", timeOff: [] },
  { name: "Paul Boateng", max: 10, stepVan: false, edv: true, nursery: false, status: "active", timeOff: [] },
  { name: "Stephen Kofi", max: 20, stepVan: true, edv: false, nursery: false, status: "active", timeOff: [] },
];

const extraNames = [
  "Ama Owusu", "Kojo Appiah", "Linda Foster", "Brian Clark", "Derrick King", "Nana Agyeman",
  "Felicia Grant", "Victor Mills", "Kofi Adams", "Sarah Jenkins", "Jason White", "Theresa Cole",
  "Peter Hammond", "Miriam Banks", "Kevin Brooks", "Ibrahim Conteh", "Fatima Diallo", "Noah Scott",
  "Grace Mensah", "Eric Turner", "Joseph Adu", "Mary Hill", "Chris Bennett", "Solomon Gray",
  "Angela Reed", "Robert Lewis", "Ivy Thompson", "Prince Ofori", "Diana Mason", "John Walker",
  "Cynthia Moore", "Philip Young", "Janet Hughes", "Mark Edwards", "Esther Nelson", "Caleb Price",
  "George Collins", "Hannah Wood", "Louis Brooks", "Rita Carter", "Dennis Bell", "Evelyn Hayes",
  "Frank Morgan", "Patricia Ross", "Henry Cooper", "Joyce Barnes", "Oscar Bryant", "Rachel Perry",
  "Thomas Powell", "Gloria Ward", "Albert Cox", "Monica Flores", "Nathan Russell", "Beatrice Bailey",
  "Simon Howard", "Laura Rivera", "Gabriel James", "Clara Sanders", "Marcus Hughes", "Doris Coleman",
  "Wesley Jenkins", "Naomi Butler", "Felix Simmons", "Regina Peterson", "Vincent Long", "Helen Foster",
  "Arthur Coleman", "Sophia Bryant", "Elias Ward", "Ruth Patterson", "Calvin Griffin", "Martha Diaz",
  "Ronald West",
];

const state = {
  days: structuredClone(daySeed),
  drivers: buildDrivers(),
  selectedDayKey: "wed",
  selectedCandidates: new Set(),
  manualAssignments: {},
  pendingImport: null,
  importHistory: [],
  autoRefresh: false,
  refreshTimer: null,
};

function buildDrivers() {
  const generated = extraNames.map((name, index) => ({
    name,
    max: [40, 40, 30, 20, 20, 10][index % 6],
    stepVan: index % 3 !== 1,
    edv: index % 4 !== 2,
    nursery: index % 8 === 0,
    status: "active",
    timeOff: index % 29 === 0 ? ["thu"] : [],
  }));
  return [...driversSeed, ...generated].slice(0, 90);
}

function normalizeBool(value) {
  return ["yes", "true", "1", "y", "certified", "level 1", "level 2", "level 3"].includes(String(value || "").trim().toLowerCase());
}

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
      }
      current = "";
      row = [];
      if (char === "\r" && next === "\n") i += 1;
    } else {
      current += char;
    }
  }
  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }
  const [headers = [], ...body] = rows;
  const keys = headers.map((h) => h.replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return body.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(keys.map((key, index) => [key, r[index] ?? ""])));
}

function restoreSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!saved) return;
    if (Array.isArray(saved.days)) state.days = saved.days;
    if (Array.isArray(saved.drivers)) state.drivers = saved.drivers;
    if (saved.manualAssignments) state.manualAssignments = saved.manualAssignments;
    if (Array.isArray(saved.importHistory)) state.importHistory = saved.importHistory;
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveState() {
  const snapshot = {
    days: state.days,
    drivers: state.drivers.map(({ name, transporterId, max, stepVan, edv, nursery, cdv, standardParcel, status, timeOff }) => ({
      name,
      transporterId,
      max,
      stepVan,
      edv,
      nursery,
      cdv,
      standardParcel,
      status,
      timeOff,
    })),
    manualAssignments: state.manualAssignments,
    importHistory: state.importHistory.slice(0, 12),
  };
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}

function generateSchedule() {
  state.drivers.forEach((driver) => {
    driver.assigned = 0;
    driver.days = [];
  });
  state.days.forEach((day) => {
    day.assignments = [];
  });

  const sortedDrivers = [...state.drivers]
    .filter((driver) => driver.status !== "inactive")
    .sort((a, b) => b.max - a.max || certificationScore(b) - certificationScore(a) || a.name.localeCompare(b.name));

  state.days.forEach((day) => {
    for (const name of state.manualAssignments[day.key] || []) {
      const driver = state.drivers.find((item) => item.name === name);
      if (driver && canAssign(driver, day.key) && day.assignments.length < day.routes) {
        driver.assigned += shiftHours;
        driver.days.push(day.key);
        day.assignments.push(driver.name);
      }
    }

    const need = day.routes;
    for (const driver of sortedDrivers) {
      if (day.assignments.length >= need) break;
      if (!canAssign(driver, day.key)) continue;
      driver.assigned += shiftHours;
      driver.days.push(day.key);
      day.assignments.push(driver.name);
    }
  });
}

function certificationScore(driver) {
  return Number(driver.stepVan) + Number(driver.edv) + Number(driver.nursery);
}

function canAssign(driver, dayKey) {
  if (driver.status !== "active") return false;
  if (driver.timeOff?.includes(dayKey)) return false;
  if ((driver.assigned || 0) + shiftHours > driver.max) return false;
  if (driver.days?.includes(dayKey)) return false;
  return true;
}

function candidatesForDay(day) {
  const sort = document.querySelector("#sortCandidates").value;
  const statusFilter = document.querySelector("input[name='driverStatus']:checked")?.value || "all";
  const candidates = state.drivers
    .filter((driver) => canAssign(driver, day.key))
    .filter((driver) => matchesDriverStatusFilter(driver, statusFilter))
    .map((driver) => ({ ...driver, remaining: driver.max - (driver.assigned || 0) }));

  candidates.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "certs") return certificationScore(b) - certificationScore(a) || b.remaining - a.remaining;
    return b.remaining - a.remaining || certificationScore(b) - certificationScore(a);
  });
  return candidates;
}

function matchesDriverStatusFilter(driver, statusFilter) {
  if (statusFilter === "active") return driver.status === "active";
  if (statusFilter === "inactive") return driver.status === "inactive";
  if (statusFilter === "excludeMaxed") return driver.status === "active" && (driver.max - (driver.assigned || 0)) > 0;
  return true;
}

function selectedDay() {
  return state.days.find((day) => day.key === state.selectedDayKey) || state.days[3];
}

function formatPct(value) {
  return `${Math.round(value * 10) / 10}%`;
}

function render() {
  generateSchedule();
  renderSummary();
  renderBoard();
  renderInspector();
  renderDriverHoursTable();
  renderAlerts();
  renderImportHistory();
}

function renderSummary() {
  const needed = state.days.reduce((sum, day) => sum + day.routes, 0);
  const assigned = state.days.reduce((sum, day) => sum + day.assignments.length, 0);
  const open = Math.max(0, needed - assigned);
  const activeDrivers = state.drivers.filter((d) => d.status === "active").length;
  const avgShifts = 3;
  const target = Math.ceil(needed / avgShifts);
  const hireNeed = Math.max(0, target - activeDrivers + 5);
  const threeWeekGap = Math.max(0, needed * 3 - activeDrivers * avgShifts * 3);
  const utilization = state.drivers.reduce((sum, d) => sum + (d.assigned || 0), 0) / Math.max(1, activeDrivers);

  setText("neededTotal", needed);
  setText("assignedTotal", assigned);
  setText("openRoutes", open);
  setText("coveragePercent", formatPct((assigned / needed) * 100));
  setText("utilizationAvg", `${utilization.toFixed(1)} / 40 hrs`);
  setText("activeDrivers", activeDrivers);
  setText("targetHeadcount", target);
  setText("hireNeeded", hireNeed);
  setText("coverageGap", threeWeekGap);
  setText("alertCount", state.days.filter((d) => d.assignments.length < d.routes).length);
  document.querySelector("#shortageBanner").textContent = `${state.days.filter((d) => d.assignments.length < d.routes).length} Days Below 100%`;
}

function renderBoard() {
  const board = document.querySelector("#scheduleBoard");
  board.innerHTML = "";
  state.days.forEach((day) => {
    const open = Math.max(0, day.routes - day.assignments.length);
    const coverage = Math.min(100, (day.assignments.length / day.routes) * 100);
    const column = document.createElement("article");
    column.className = `day-column ${day.key === state.selectedDayKey ? "selected" : ""}`;
    column.innerHTML = `
      <button class="day-head" data-day="${day.key}">
        <strong>${day.label}</strong>
        <span>${open ? `${open} open` : "Covered"}</span>
      </button>
      <dl class="day-metrics">
        <div><dt>Routes Needed</dt><dd>${day.routes}</dd></div>
        <div><dt>Assigned</dt><dd class="success">${day.assignments.length}</dd></div>
        <div><dt>Open</dt><dd class="${open ? "danger" : ""}">${open}</dd></div>
        <div><dt>Coverage</dt><dd class="${coverage < 100 ? "danger" : ""}">${formatPct(coverage)}</dd></div>
      </dl>
      <div class="assignment-list">
        ${day.assignments.slice(0, 8).map((name) => assignmentRow(name)).join("")}
        <span class="more-count">+${Math.max(0, day.assignments.length - 8)} more</span>
      </div>
      ${open ? `<button class="fill-button" data-fill="${day.key}">Fill Routes</button>` : ""}
    `;
    board.append(column);
  });
}

function assignmentRow(name) {
  const driver = state.drivers.find((d) => d.name === name);
  return `
    <div class="assignment-row">
      <span class="status-dot"></span>
      <b>${name}</b>
      <small>${shiftHours}h</small>
      ${driver?.stepVan ? '<span class="tag sv">SV</span>' : ""}
      ${driver?.edv ? '<span class="tag edv">EDV</span>' : ""}
    </div>
  `;
}

function renderInspector() {
  const day = selectedDay();
  const open = Math.max(0, day.routes - day.assignments.length);
  const coverage = (day.assignments.length / day.routes) * 100;
  const assignedDrivers = state.drivers.filter((driver) => driver.days?.includes(day.key));
  const utilization = assignedDrivers.reduce((sum, driver) => sum + driver.assigned, 0) / Math.max(1, assignedDrivers.length);
  const candidates = candidatesForDay(day);

  setText("selectedDayTitle", day.full);
  setText("dayNeeded", day.routes);
  setText("dayAssigned", day.assignments.length);
  setText("dayOpen", open);
  setText("dayCoverage", formatPct(coverage));
  setText("dayUtilization", `${utilization.toFixed(1)} / 40 hrs`);
  setText("candidateCount", `Candidates (${candidates.length})`);

  const list = document.querySelector("#candidateList");
  list.innerHTML = candidates.slice(0, 9).map((driver) => `
    <label class="candidate-row">
      <input type="checkbox" value="${driver.name}" ${state.selectedCandidates.has(driver.name) ? "checked" : ""} />
      <span class="status-dot"></span>
      <strong>${driver.name}</strong>
      <b>${driver.remaining} hrs</b>
      ${driver.stepVan ? '<span class="tag sv">SV</span>' : ""}
      ${driver.edv ? '<span class="tag edv">EDV</span>' : ""}
      ${driver.nursery ? '<span class="tag nr">NR</span>' : ""}
    </label>
  `).join("");
  setText("assignSelected", `Assign Selected (${state.selectedCandidates.size})`);
}

function renderDriverHoursTable() {
  const table = document.querySelector("#driverHoursTable");
  if (!table) return;
  const search = String(document.querySelector("#driverSearch")?.value || "").trim().toLowerCase();
  const statusFilter = document.querySelector("input[name='driverStatus']:checked")?.value || "all";
  const rows = state.drivers
    .filter((driver) => !search || driver.name.toLowerCase().includes(search) || String(driver.transporterId || "").toLowerCase().includes(search))
    .filter((driver) => matchesDriverStatusFilter(driver, statusFilter))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 80);

  table.innerHTML = `
    <div class="driver-hours-header">
      <span>Driver</span>
      <span>ID</span>
      <span>Status</span>
      <span>Certs</span>
      <span>Weekly Cap</span>
      <span>Scheduled</span>
      <span>Remaining</span>
    </div>
    ${rows.map((driver) => {
      const remaining = Math.max(0, driver.max - (driver.assigned || 0));
      return `
        <div class="driver-hours-row">
          <strong title="${escapeHtml(driver.name)}">${escapeHtml(driver.name)}</strong>
          <span>${escapeHtml(driver.transporterId || "-")}</span>
          <label class="status-select-wrap">
            <select class="status-select ${driver.status === "active" ? "active" : "inactive"}" data-driver-status="${escapeHtml(driver.name)}">
              <option value="active" ${driver.status === "active" ? "selected" : ""}>Active</option>
              <option value="inactive" ${driver.status === "inactive" ? "selected" : ""}>Inactive</option>
            </select>
          </label>
          <span class="cert-stack">
            ${driver.stepVan ? '<b class="tag sv">SV</b>' : ""}
            ${driver.edv ? '<b class="tag edv">EDV</b>' : ""}
            ${driver.nursery ? '<b class="tag nr">NR</b>' : ""}
          </span>
          <label class="hours-input">
            <input type="number" min="0" max="50" step="10" value="${driver.max}" data-driver-hours="${escapeHtml(driver.name)}" />
            <span>hrs</span>
          </label>
          <span>${driver.assigned || 0} hrs</span>
          <span class="${remaining === 0 ? "danger" : "success"}">${remaining} hrs</span>
        </div>
      `;
    }).join("")}
  `;
}

function renderAlerts() {
  const needed = state.days.reduce((sum, day) => sum + day.routes, 0);
  const activeDrivers = state.drivers.filter((d) => d.status === "active").length;
  const gap = Math.max(0, needed * 3 - activeDrivers * 3 * 3);
  const alerts = state.days
    .filter((day) => day.assignments.length < day.routes)
    .map((day) => {
      const open = day.routes - day.assignments.length;
      return `<button class="alert-row" data-day="${day.key}"><strong>${open} routes open on ${day.label}</strong><span>Open Schedule</span></button>`;
    });
  alerts.unshift(`<button class="alert-row"><strong>${gap} route shifts uncovered over next 3 weeks</strong><span>View Details</span></button>`);
  document.querySelector("#alertsList").innerHTML = alerts.join("");
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function driverRowsToRecords(rows) {
  return rows.map((row) => ({
    name: row.name || row.driver_name || row.associate || row.associate_name || row.name_and_id,
    transporterId: row.transporterid || row.transporter_id || row.employee_id || row.id,
    max: inferMaxWeeklyHours(row),
    stepVan: normalizeBool(row.step_van || row.stepvan || row.sv) || textIncludes(row.qualifications, "step van"),
    edv: normalizeBool(row.edv || row.rivian) || textIncludes(row.qualifications, "edv") || textIncludes(row.qualifications, "rivian"),
    nursery: normalizeBool(row.nursery || row.nursery_level) || textIncludes(row.qualifications, "nursery"),
    cdv: textIncludes(row.qualifications, "cdv"),
    standardParcel: textIncludes(row.qualifications, "standard parcel"),
    status: normalizeStatus(row.status),
    timeOff: String(row.time_off || row.timeoff || "").toLowerCase().split(/[|;]/).map((v) => v.trim()).filter(Boolean),
  })).filter((driver) => driver.name);
}

function inferMaxWeeklyHours(row) {
  const explicit = Number(row.max_weekly_hours || row.max_hours || row.weekly_hours);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const position = String(row.position || "").toLowerCase();
  if (position.includes("driver")) return 40;
  if (position.includes("helper")) return 20;
  return 40;
}

function normalizeStatus(value) {
  const status = String(value || "active").trim().toLowerCase();
  if (["active", "available", "enabled"].includes(status)) return "active";
  if (status === "inactive" || status === "terminated" || status === "offboarded") return "inactive";
  return status || "active";
}

function textIncludes(value, term) {
  return String(value || "").toLowerCase().includes(term);
}

function applyDemandRows(rows) {
  const byDay = new Map(rows.map((row) => [String(row.day || row.date || "").toLowerCase().slice(0, 3), Number(row.routes || row.required_routes || row.route_count || 0)]));
  state.days.forEach((day) => {
    const nextRoutes = byDay.get(day.key) || byDay.get(day.label.toLowerCase().slice(0, 3));
    if (nextRoutes) day.routes = nextRoutes;
  });
}

function validationFor(type, rows) {
  const headers = Object.keys(rows[0] || {});
  const hasAny = (options) => options.some((option) => headers.includes(option));
  const missing = [];
  if (!rows.length) missing.push("at least one data row");
  if (type === "drivers") {
    if (!hasAny(["name", "driver_name", "associate", "associate_name", "name_and_id"])) missing.push("name, associate_name, or Cortex Name and ID");
  }
  if (type === "demand") {
    if (!hasAny(["day", "date"])) missing.push("day or date");
    if (!hasAny(["routes", "required_routes", "route_count"])) missing.push("routes or route_count");
  }
  return { headers, missing, valid: missing.length === 0 };
}

function previewRows(type, rows, fileName) {
  const validation = validationFor(type, rows);
  const label = type === "drivers" ? "Associate / Driver" : "Route Demand";
  state.pendingImport = { type, rows, fileName, validation };
  const badge = document.querySelector("#previewBadge");
  const summary = document.querySelector("#previewSummary");
  const details = document.querySelector("#previewDetails");
  const table = document.querySelector("#previewTable");
  const applyButton = document.querySelector("#applyImport");
  badge.className = `preview-badge ${validation.valid ? "ready" : "error"}`;
  badge.textContent = validation.valid ? "Ready" : "Needs Fix";
  summary.textContent = `${label} preview: ${rows.length} row${rows.length === 1 ? "" : "s"} from ${fileName}.`;
  details.innerHTML = validation.valid
    ? `<span>Ready to apply. Existing ${type === "drivers" ? "driver roster" : "route demand"} data will be updated after confirmation.</span>${type === "drivers" ? "<span>If Cortex does not include max hours, drivers default to 40h and helper-only associates default to 20h.</span>" : ""}`
    : `<span>Missing required column: ${validation.missing.join(", ")}.</span>`;
  applyButton.disabled = !validation.valid;
  table.innerHTML = renderPreviewTable(rows);
}

function renderPreviewTable(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]).slice(0, 7);
  const body = rows.slice(0, 6).map((row) => `
    <tr>${headers.map((header) => `<td>${escapeHtml(row[header] || "")}</td>`).join("")}</tr>
  `).join("");
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

async function previewImport(file, type) {
  if (!file) return;
  const rows = parseCSV(await file.text());
  previewRows(type, rows, file.name);
}

function applyPendingImport() {
  if (!state.pendingImport?.validation?.valid) return;
  const { type, rows, fileName } = state.pendingImport;
  if (type === "drivers") {
    state.drivers = driverRowsToRecords(rows);
    state.manualAssignments = {};
    state.selectedCandidates.clear();
  } else {
    applyDemandRows(rows);
  }
  const record = {
    type,
    fileName,
    count: rows.length,
    when: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
  };
  state.importHistory.unshift(record);
  state.importHistory = state.importHistory.slice(0, 12);
  state.pendingImport = null;
  document.querySelector("#lastImportStatus").textContent = `${record.type === "drivers" ? "Roster" : "Demand"} updated ${record.when}`;
  resetPreview();
  saveState();
  render();
}

function downloadTemplates() {
  const drivers = "name,max_weekly_hours,step_van,edv,nursery_level,status,time_off\nAlexander Ghazi,40,yes,yes,,active,\nAndrew Appiah,20,no,yes,Level 1,active,\nNew Hire One,20,no,yes,Level 1,active,thu\n";
  const cortex = "Name and ID,TransporterID,Position,Qualifications,ID expiration,Personal Phone Number,Work Phone Number,Email,Status\nAbdul Sesay,A1AF9SOXK0Z7UD,\"Helper, Driver\",\"CDV, Standard Parcel , Step Van\",2027-03-23,,,,ACTIVE\n";
  const demand = "day,routes,step_van,edv,nursery\nsun,36,5,8,2\nmon,47,7,10,3\ntue,39,6,8,2\nwed,48,8,10,3\nthu,40,6,8,2\nfri,33,4,7,1\nsat,35,5,7,1\n";
  const blob = new Blob([`associate_template.csv\n${drivers}\ncortex_associatedata_example.csv\n${cortex}\nroute_demand_template.csv\n${demand}`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dsp_scheduler_import_templates.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function renderImportHistory() {
  const list = document.querySelector("#importHistoryList");
  if (!list) return;
  if (!state.importHistory.length) {
    list.innerHTML = `<span class="empty-history">No imports applied yet.</span>`;
    return;
  }
  list.innerHTML = state.importHistory.map((item) => `
    <div class="history-row">
      <strong>${item.type === "drivers" ? "Roster" : "Demand"}</strong>
      <span>${escapeHtml(item.fileName)}</span>
      <b>${item.count} rows</b>
      <small>${item.when}</small>
    </div>
  `).join("");
}

function resetPreview() {
  state.pendingImport = null;
  document.querySelector("#previewBadge").className = "preview-badge idle";
  document.querySelector("#previewBadge").textContent = "Waiting";
  document.querySelector("#previewSummary").textContent = "Choose a Cortex export to preview it before applying changes.";
  document.querySelector("#previewDetails").innerHTML = `
    <span>Accepted day values: sun, mon, tue, wed, thu, fri, sat.</span>
    <span>Accepted yes/no values: yes, no, true, false, 1, 0.</span>
  `;
  document.querySelector("#previewTable").innerHTML = "";
  document.querySelector("#applyImport").disabled = true;
}

function resetSavedData() {
  localStorage.removeItem(storageKey);
  state.days = structuredClone(daySeed);
  state.drivers = buildDrivers();
  state.manualAssignments = {};
  state.importHistory = [];
  state.selectedCandidates.clear();
  document.querySelector("#lastImportStatus").textContent = "Saved data reset";
  resetPreview();
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportSchedule() {
  const rows = ["day,routes_needed,drivers_assigned,open_routes,assigned_drivers"];
  state.days.forEach((day) => {
    rows.push(`${day.label},${day.routes},${day.assignments.length},${Math.max(0, day.routes - day.assignments.length)},"${day.assignments.join("; ")}"`);
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dsp_week_schedule.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelector("#runScheduler").addEventListener("click", render);
  document.querySelector("#refreshList").addEventListener("click", renderInspector);
  document.querySelector("#exportSchedule").addEventListener("click", exportSchedule);
  document.querySelector("#openImport").addEventListener("click", () => document.querySelector("#importDialog").showModal());
  document.querySelector("#quickImport").addEventListener("click", () => document.querySelector("#importDialog").showModal());
  document.querySelector("#downloadTemplate").addEventListener("click", (event) => {
    event.preventDefault();
    downloadTemplates();
  });
  document.querySelector("#applyImport").addEventListener("click", (event) => {
    event.preventDefault();
    applyPendingImport();
  });
  document.querySelector("#clearSavedData").addEventListener("click", (event) => {
    event.preventDefault();
    resetSavedData();
  });
  document.querySelector("#sortCandidates").addEventListener("change", renderInspector);
  document.querySelector("#driverSearch").addEventListener("input", renderDriverHoursTable);
  document.querySelector("#driverHoursTable").addEventListener("change", (event) => {
    const hoursInput = event.target.closest("[data-driver-hours]");
    const statusInput = event.target.closest("[data-driver-status]");
    const name = hoursInput?.dataset.driverHours || statusInput?.dataset.driverStatus;
    const driver = state.drivers.find((item) => item.name === name);
    if (!driver) return;
    if (hoursInput) {
      driver.max = Math.max(0, Math.min(50, Number(hoursInput.value || 0)));
      hoursInput.value = driver.max;
    }
    if (statusInput) {
      driver.status = statusInput.value;
      if (driver.status === "inactive") {
        for (const dayKey of Object.keys(state.manualAssignments)) {
          state.manualAssignments[dayKey] = state.manualAssignments[dayKey].filter((driverName) => driverName !== driver.name);
        }
      }
    }
    state.selectedCandidates.clear();
    saveState();
    render();
  });
  document.querySelector("#driverUpload").addEventListener("change", (event) => previewImport(event.target.files[0], "drivers"));
  document.querySelector("#demandUpload").addEventListener("change", (event) => previewImport(event.target.files[0], "demand"));
  document.querySelector("#bufferInput").addEventListener("change", (event) => {
    const buffer = Number(event.target.value || 0) / 100;
    const base = [36, 47, 39, 48, 40, 33, 35];
    state.days.forEach((day, index) => {
      day.routes = Math.round(base[index] * (1 + buffer));
    });
    saveState();
    render();
  });

  document.querySelector("#scheduleBoard").addEventListener("click", (event) => {
    const dayKey = event.target.closest("[data-day], [data-fill]")?.dataset.day || event.target.closest("[data-fill]")?.dataset.fill;
    if (dayKey) {
      state.selectedDayKey = dayKey;
      state.selectedCandidates.clear();
      render();
    }
  });

  document.querySelector("#candidateList").addEventListener("change", (event) => {
    if (!event.target.matches("input[type='checkbox']")) return;
    if (event.target.checked) state.selectedCandidates.add(event.target.value);
    else state.selectedCandidates.delete(event.target.value);
    setText("assignSelected", `Assign Selected (${state.selectedCandidates.size})`);
  });

  document.querySelector("#assignSelected").addEventListener("click", () => {
    const day = selectedDay();
    const open = Math.max(0, day.routes - day.assignments.length);
    const picks = [...state.selectedCandidates].slice(0, open);
    state.manualAssignments[day.key] = [...new Set([...(state.manualAssignments[day.key] || []), ...picks])];
    state.selectedCandidates.clear();
    saveState();
    render();
  });

  document.querySelector("#autoRefreshToggle").addEventListener("change", (event) => {
    state.autoRefresh = event.target.checked;
    const hours = Number(document.querySelector("#refreshInterval").value);
    clearInterval(state.refreshTimer);
    if (state.autoRefresh) {
      document.querySelector("#automationStatus").textContent = `Automation ready: checking approved import source every ${hours} hours. Connect export folder/API in production.`;
      state.refreshTimer = setInterval(render, hours * 60 * 60 * 1000);
    } else {
      document.querySelector("#automationStatus").textContent = "Automation is off. Upload CSV files manually when Cortex changes.";
    }
  });

  document.querySelector("#clearFilters").addEventListener("click", () => {
    document.querySelectorAll(".filters input").forEach((input) => {
      if (input.type === "checkbox") input.checked = true;
      if (input.type === "radio") input.checked = input.value === "all";
    });
    render();
  });
  document.querySelectorAll("input[name='driverStatus']").forEach((input) => {
    input.addEventListener("change", render);
  });
}

restoreSavedState();
bindEvents();
render();
