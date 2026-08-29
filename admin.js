import { initializeApp } from "https://esm.sh/firebase@10/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://esm.sh/firebase@10/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "https://esm.sh/firebase@10/firestore";
import { firebaseConfig, PROGRAM_NAME, CAPACITY, BRANCH_GROUPS, ALL_BRANCHES, branchRegion } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById("loginProgramName").textContent = PROGRAM_NAME;
document.getElementById("dashProgramName").textContent = PROGRAM_NAME;

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    loadRegistrations();
  } else {
    dashboardView.classList.add("hidden");
    loginView.classList.remove("hidden");
  }
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const errEl = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");
  errEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Signing in…";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    errEl.textContent = "Incorrect email or password.";
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enter";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
let registrations = [];

const filterBranchSelect = document.getElementById("filterBranch");
ALL_BRANCHES.forEach((b) => {
  const opt = document.createElement("option");
  opt.value = b;
  opt.textContent = b;
  filterBranchSelect.appendChild(opt);
});

async function loadRegistrations() {
  document.getElementById("loadingBlock").classList.remove("hidden");
  document.getElementById("dashContent").classList.add("hidden");
  try {
    const q = query(collection(db, "registrations"), orderBy("seq", "asc"));
    const snap = await getDocs(q);
    registrations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error(e);
    registrations = [];
  }
  document.getElementById("loadingBlock").classList.add("hidden");
  document.getElementById("dashContent").classList.remove("hidden");
  renderStats();
  renderBranchBreakdown();
  renderTable();
}

document.getElementById("refreshBtn").addEventListener("click", loadRegistrations);

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
function renderStats() {
  const male = registrations.filter((r) => r.gender === "Male").length;
  const female = registrations.filter((r) => r.gender === "Female").length;
  const workers = registrations.filter((r) => r.workerStatus === "Worker").length;
  const nonWorkers = registrations.filter((r) => r.workerStatus === "Non-worker").length;

  const cards = [
    ["Total / Capacity", `${registrations.length} / ${CAPACITY}`],
    ["Male", male],
    ["Female", female],
    ["Workers", workers],
    ["Non-workers", nonWorkers],
  ];
  document.getElementById("statsGrid").innerHTML = cards
    .map(([label, value]) => `<div class="stat-card"><p class="stat-label">${label}</p><p class="stat-value">${value}</p></div>`)
    .join("");
}

function renderBranchBreakdown() {
  const counts = {};
  registrations.forEach((r) => {
    counts[r.branch] = (counts[r.branch] || 0) + 1;
  });
  const html = BRANCH_GROUPS.map(
    (g) => `
      <div>
        <p class="branch-region">${g.region}</p>
        <ul class="branch-list">
          ${g.branches.map((b) => `<li><span>${b}</span><span>${counts[b] || 0}</span></li>`).join("")}
        </ul>
      </div>
    `
  ).join("");
  document.getElementById("branchCols").innerHTML = html;
}

// ---------------------------------------------------------------------------
// Table + filters
// ---------------------------------------------------------------------------
function formatDateTime(ts) {
  try {
    return new Date(ts).toLocaleString("en-NG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function getFiltered() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const g = document.getElementById("filterGender").value;
  const w = document.getElementById("filterWorker").value;
  const b = document.getElementById("filterBranch").value;
  return registrations.filter((r) => {
    if (q && !((r.fullName || "").toLowerCase().includes(q) || (r.phone || "").includes(q))) return false;
    if (g && r.gender !== g) return false;
    if (w && r.workerStatus !== w) return false;
    if (b && r.branch !== b) return false;
    return true;
  });
}

function renderTable() {
  const filtered = getFiltered();
  const body = document.getElementById("tableBody");
  if (filtered.length === 0) {
    body.innerHTML = `<tr class="empty-row"><td colspan="8">No registrants match these filters.</td></tr>`;
  } else {
    body.innerHTML = filtered
      .map(
        (r) => `
        <tr>
          <td class="row-seq">${String(r.seq ?? "").padStart(4, "0")}</td>
          <td>${r.fullName}</td>
          <td class="row-phone">${r.phone}</td>
          <td>${r.gender}</td>
          <td>${r.workerStatus}</td>
          <td>${r.branch}</td>
          <td class="row-time">${formatDateTime(r.timestamp)}</td>
          <td><button class="row-delete" data-id="${r.id}" aria-label="Delete ${r.fullName}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button></td>
        </tr>`
      )
      .join("");
  }
  document.getElementById("tableFootnote").textContent = `Showing ${filtered.length} of ${registrations.length} registrants.`;

  body.querySelectorAll(".row-delete").forEach((btn) => {
    btn.addEventListener("click", () => openDeleteModal(btn.dataset.id));
  });
}

["searchInput", "filterGender", "filterWorker", "filterBranch"].forEach((id) => {
  document.getElementById(id).addEventListener("input", renderTable);
  document.getElementById(id).addEventListener("change", renderTable);
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
let pendingDeleteId = null;
const deleteModal = document.getElementById("deleteModal");

function openDeleteModal(id) {
  const record = registrations.find((r) => r.id === id);
  if (!record) return;
  pendingDeleteId = id;
  document.getElementById("deleteModalText").innerHTML = `This will permanently remove <strong>${record.fullName}</strong> (${record.branch}) from the conference roll.`;
  deleteModal.classList.remove("hidden");
}

document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
  pendingDeleteId = null;
  deleteModal.classList.add("hidden");
});

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  const record = registrations.find((r) => r.id === pendingDeleteId);
  const btn = document.getElementById("confirmDeleteBtn");
  btn.disabled = true;
  btn.textContent = "Removing…";
  try {
    await deleteDoc(doc(db, "registrations", pendingDeleteId));
    if (record?.phone) {
      const phoneDigits = record.phone.replace(/\D/g, "");
      try {
        await deleteDoc(doc(db, "phones", phoneDigits));
      } catch (e) {
        /* phone doc may already be gone */
      }
    }
    registrations = registrations.filter((r) => r.id !== pendingDeleteId);
    renderStats();
    renderBranchBreakdown();
    renderTable();
  } catch (e) {
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = "Remove";
    pendingDeleteId = null;
    deleteModal.classList.add("hidden");
  }
});

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------
function toCSV(rows) {
  const headers = ["Seq", "Full Name", "Phone", "Gender", "Category", "Branch", "Region", "Registered At"];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  rows.forEach((r) => {
    lines.push(
      [r.seq ?? "", r.fullName, r.phone, r.gender, r.workerStatus, r.branch, branchRegion(r.branch), formatDateTime(r.timestamp)]
        .map(escape)
        .join(",")
    );
  });
  return lines.join("\r\n");
}

document.getElementById("exportBtn").addEventListener("click", () => {
  const csv = toCSV(getFiltered());
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `kingdom-conference-2026-registrations-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
