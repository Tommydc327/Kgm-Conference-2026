import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, PROGRAM_NAME, ORG_NAME, CAPACITY, BRANCH_GROUPS } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Populate static text + branch dropdown
// ---------------------------------------------------------------------------
document.getElementById("orgLabel").textContent = ORG_NAME;
document.getElementById("programTitle").textContent = PROGRAM_NAME;

const branchSelect = document.getElementById("branch");
BRANCH_GROUPS.forEach((group) => {
  const optgroup = document.createElement("optgroup");
  optgroup.label = group.region;
  group.branches.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    optgroup.appendChild(opt);
  });
  branchSelect.appendChild(optgroup);
});

// ---------------------------------------------------------------------------
// Toggle groups (Gender, Worker status)
// ---------------------------------------------------------------------------
function wireToggle(containerId) {
  const container = document.getElementById(containerId);
  const buttons = Array.from(container.querySelectorAll(".toggle-btn"));
  let value = "";
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      value = btn.dataset.value;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  return { get: () => value };
}
const genderToggle = wireToggle("genderToggle");
const workerToggle = wireToggle("workerToggle");

// ---------------------------------------------------------------------------
// Capacity roll strip
// ---------------------------------------------------------------------------
const rollCountEl = document.getElementById("rollCount");
const rollFillEl = document.getElementById("rollFill");
const rollNoteEl = document.getElementById("rollNote");
const formSection = document.getElementById("formSection");
const fullSection = document.getElementById("fullSection");

async function getCurrentCount() {
  try {
    const snap = await getDoc(doc(db, "meta", "counter"));
    return snap.exists() ? snap.data().count || 0 : 0;
  } catch (e) {
    console.error("count fetch failed", e);
    return null;
  }
}

async function refreshRoll() {
  const count = await getCurrentCount();
  if (count === null) {
    rollCountEl.textContent = "—";
    return null;
  }
  const pct = Math.min((count / CAPACITY) * 100, 100);
  rollCountEl.textContent = `${count} / ${CAPACITY}`;
  rollFillEl.style.width = `${pct}%`;
  const spotsLeft = Math.max(CAPACITY - count, 0);
  rollNoteEl.textContent =
    count >= CAPACITY ? "Capacity reached." : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining.`;
  if (count >= CAPACITY) {
    formSection.classList.add("hidden");
    fullSection.classList.remove("hidden");
    fullSection.innerHTML = `
      <p class="font-display" style="font-size:24px; margin:0 0 8px;">Registration Closed</p>
      <p style="font-size:14px; opacity:.8; margin:0;">${PROGRAM_NAME} has reached its capacity of ${CAPACITY} registrants. Please contact your branch leader for further guidance.</p>
    `;
  }
  return count;
}
refreshRoll();

// ---------------------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------------------
const form = document.getElementById("regForm");
const submitBtn = document.getElementById("submitBtn");
const submitErrorEl = document.getElementById("submitError");

function sanitizePhone(phone) {
  return (phone || "").replace(/\D/g, "");
}

function setFieldError(id, message) {
  const input = document.getElementById(id);
  const errEl = document.getElementById(`err-${id}`);
  if (message) {
    if (input) input.classList.add("error");
    errEl.textContent = message;
    errEl.classList.remove("hidden");
  } else {
    if (input) input.classList.remove("error");
    errEl.classList.add("hidden");
  }
}

function validate() {
  let ok = true;
  const fullName = document.getElementById("fullName").value.trim();
  if (fullName.length < 3) {
    setFieldError("fullName", "Enter your full name.");
    ok = false;
  } else setFieldError("fullName", "");

  const phoneDigits = sanitizePhone(document.getElementById("phone").value);
  if (phoneDigits.length < 10) {
    setFieldError("phone", "Enter a valid phone number.");
    ok = false;
  } else setFieldError("phone", "");

  if (!genderToggle.get()) {
    setFieldError("gender", "Select your gender.");
    ok = false;
  } else setFieldError("gender", "");

  if (!workerToggle.get()) {
    setFieldError("workerStatus", "Select worker or non-worker.");
    ok = false;
  } else setFieldError("workerStatus", "");

  const branch = branchSelect.value;
  if (!branch) {
    setFieldError("branch", "Select your branch.");
    ok = false;
  } else setFieldError("branch", "");

  return ok;
}

function showTicket(record) {
  formSection.classList.add("hidden");
  const ticketSection = document.getElementById("ticketSection");
  ticketSection.classList.remove("hidden");
  ticketSection.innerHTML = `
    <div class="ticket-wrap fade-in">
      <div class="card ticket">
        <div class="ticket-top">
          <div>
            <p class="ticket-eyebrow">Entry №</p>
            <p class="ticket-num">${String(record.seq).padStart(4, "0")}</p>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B5502F" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        </div>
        <div class="ticket-dashed"></div>
        <dl>
          <div class="ticket-row"><dt>Name</dt><dd>${record.fullName}</dd></div>
          <div class="ticket-row"><dt>Gender</dt><dd>${record.gender}</dd></div>
          <div class="ticket-row"><dt>Category</dt><dd>${record.workerStatus}</dd></div>
          <div class="ticket-row"><dt>Branch</dt><dd>${record.branch}</dd></div>
          <div class="ticket-row"><dt>Program</dt><dd>${PROGRAM_NAME}</dd></div>
        </dl>
      </div>
      <p class="ticket-hint">You're registered! Take a screenshot of this ticket to keep for your records.</p>
      <button class="ghost-btn" id="registerAnotherBtn">Register Another Person</button>
    </div>
  `;
  document.getElementById("registerAnotherBtn").addEventListener("click", () => {
    form.reset();
    genderToggle.buttons?.forEach?.(() => {});
    document.querySelectorAll(".toggle-btn.active").forEach((b) => b.classList.remove("active"));
    ticketSection.classList.add("hidden");
    ticketSection.innerHTML = "";
    formSection.classList.remove("hidden");
    submitErrorEl.classList.add("hidden");
    refreshRoll();
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitErrorEl.classList.add("hidden");
  if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving your entry…";

  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const phoneDigits = sanitizePhone(phone);
  const gender = genderToggle.get();
  const workerStatus = workerToggle.get();
  const branch = branchSelect.value;

  try {
    const regRef = doc(collection(db, "registrations"));
    const phoneRef = doc(db, "phones", phoneDigits);
    const counterRef = doc(db, "meta", "counter");

    const record = await runTransaction(db, async (tx) => {
      const [phoneSnap, counterSnap] = await Promise.all([tx.get(phoneRef), tx.get(counterRef)]);

      if (phoneSnap.exists()) {
        throw new Error("DUPLICATE");
      }
      const current = counterSnap.exists() ? counterSnap.data().count || 0 : 0;
      if (current >= CAPACITY) {
        throw new Error("FULL");
      }
      const seq = current + 1;
      const rec = {
        seq,
        fullName,
        phone,
        gender,
        workerStatus,
        branch,
        timestamp: Date.now(),
      };
      tx.set(regRef, rec);
      tx.set(phoneRef, { regId: regRef.id });
      tx.set(counterRef, { count: seq });
      return rec;
    });

    showTicket(record);
  } catch (err) {
    if (err.message === "DUPLICATE") {
      submitErrorEl.textContent = `This phone number is already registered for ${PROGRAM_NAME}. No need to register again.`;
    } else if (err.message === "FULL") {
      submitErrorEl.textContent = "Registration just reached capacity. Please contact your branch leader.";
      refreshRoll();
    } else {
      console.error(err);
      submitErrorEl.textContent = "Something went wrong saving your registration. Please try again.";
    }
    submitErrorEl.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Complete Registration";
  }
});
