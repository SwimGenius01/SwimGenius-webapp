// ============================================
// APP.JS — main app logic
// Runs on app.html only
// ============================================

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth }                        from "./firebase-config.js";
import { loadProfile, saveProfile as dbSaveProfile, loadTimes, saveTime } from "./db.js";
import { initCoach, getCoachReply, getAnalysis } from "./coach.js";

// ── State ─────────────────────────────────────
let currentUser = null;
let times       = [];
let goals       = [];
let drylandDone = {};
let currentDrylandTab = "stretches";

// ── Auth gate ─────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  initCoach();

  // Set sidebar name
  const name = user.displayName || (user.isAnonymous ? "Demo User" : user.email.split("@")[0]);
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  document.getElementById("sb-avatar").textContent = initials;
  document.getElementById("sb-name").textContent   = name;
  document.getElementById("prof-avatar").textContent = initials;
  document.getElementById("prof-display-name").textContent = name;

  // Set today's date on time form
  document.getElementById("t-date").valueAsDate = new Date();

  // Load data from Firestore
  await Promise.all([
    loadUserProfile(),
    loadUserTimes()
  ]);

  updateDashboard();
  renderDrylandTab();
  renderAchievements();
});

// ── Logout ────────────────────────────────────
window.handleLogout = async function() {
  await signOut(auth);
  window.location.href = "index.html";
};

// ── Navigation ────────────────────────────────
const PAGE_TITLES = {
  dashboard:    "Dashboard",
  times:        "My Times",
  coach:        "AI Coach",
  analysis:     "Analysis",
  dryland:      "Dryland & Stretches",
  achievements: "Achievements & Goals",
  account:      "My Profile"
};

window.goTo = function(page, el) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("view-" + page).classList.add("active");
  if (el) el.classList.add("active");
  document.getElementById("topbar-title").textContent = PAGE_TITLES[page] || page;
  if (page === "dashboard")    updateDashboard();
  if (page === "achievements") renderAchievements();
};

// ── Profile ───────────────────────────────────
async function loadUserProfile() {
  if (!currentUser) return;
  const data = await loadProfile(currentUser.uid);
  if (!data) return;

  const fields = [
    "p-firstname","p-lastname","p-dob","p-gender","p-nationality","p-location",
    "p-height","p-weight","p-wingspan","p-shoe",
    "p-club","p-coach","p-years","p-level",
    "p-stroke","p-distance","p-training","p-pool","p-goals"
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && data[id]) el.value = data[id];
  });
  updateProfileUI();
}

window.saveProfile = async function() {
  if (!currentUser) return;

  const fields = [
    "p-firstname","p-lastname","p-dob","p-gender","p-nationality","p-location",
    "p-height","p-weight","p-wingspan","p-shoe",
    "p-club","p-coach","p-years","p-level",
    "p-stroke","p-distance","p-training","p-pool","p-goals"
  ];
  const data = {};
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });

  await dbSaveProfile(currentUser.uid, data);
  updateProfileUI();
  showToast("✓ Profile saved");
  updateDashboard();
  updateAchBadge();
};

function updateProfileUI() {
  const first   = document.getElementById("p-firstname")?.value || "";
  const last    = document.getElementById("p-lastname")?.value  || "";
  const fullName = [first, last].filter(Boolean).join(" ") || "Swimmer";
  const club    = document.getElementById("p-club")?.value  || "";
  const level   = document.getElementById("p-level")?.value || "";
  const stroke  = document.getElementById("p-stroke")?.value || "";
  const height  = document.getElementById("p-height")?.value || "";

  const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  document.getElementById("prof-avatar").textContent       = initials;
  document.getElementById("sb-avatar").textContent         = initials;
  document.getElementById("sb-name").textContent           = fullName;
  document.getElementById("prof-display-name").textContent = fullName;
  document.getElementById("prof-display-club").textContent = club || "No club set — edit your profile";
  document.getElementById("prof-pill-height").textContent  = height ? height + " cm" : "—";
  document.getElementById("prof-pill-level").textContent   = level  || "—";
  document.getElementById("prof-pill-stroke").textContent  = stroke || "—";
}

// ── Times ─────────────────────────────────────
async function loadUserTimes() {
  if (!currentUser) return;
  times = await loadTimes(currentUser.uid);
  renderTimes();
}

window.logTime = async function() {
  const event   = document.getElementById("t-event").value;
  const min     = parseFloat(document.getElementById("t-min").value || 0);
  const sec     = parseFloat(document.getElementById("t-sec").value || 0);
  const pool    = document.getElementById("t-pool").value;
  const date    = document.getElementById("t-date").value;
  const meet    = document.getElementById("t-meet").value || "";

  if (!sec && !min) { alert("Enter a time."); return; }

  const raw      = min * 60 + sec;
  const existing = times.filter(t => t.event === event && t.pool === pool);
  const isPR     = existing.length === 0 || existing.every(t => t.raw > raw);
  const timeStr  = min > 0
    ? `${min}:${String(Math.floor(sec)).padStart(2, "0")}.${String((sec % 1).toFixed(2)).slice(2)}`
    : sec.toFixed(2);

  const newTime = { event, timeStr, pool, date, meet, isPR, raw };

  // Save to Firestore
  const id = await saveTime(currentUser.uid, newTime);
  times.unshift({ id, ...newTime });

  renderTimes();
  updateDashboard();
  clearTimeForm();
  updateAchBadge();
};

window.clearTimeForm = function() {
  ["t-min","t-sec","t-meet"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("t-date").valueAsDate = new Date();
};

function renderTimes() {
  const empty  = document.getElementById("times-empty");
  const table  = document.getElementById("times-table");
  const tbody  = document.getElementById("times-tbody");
  document.getElementById("times-count").textContent = `${times.length} entr${times.length === 1 ? "y" : "ies"}`;

  if (!times.length) {
    empty.style.display = "flex";
    table.style.display = "none";
    return;
  }
  empty.style.display = "none";
  table.style.display = "table";
  tbody.innerHTML = times.map(t => `
    <tr>
      <td>${t.event}</td>
      <td><span class="mono">${t.timeStr}</span>${t.isPR ? '<span class="badge pr" style="margin-left:4px;">PR</span>' : ""}</td>
      <td><span class="badge ${t.pool === "SCM" ? "scm" : "lcm"}">${t.pool}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text3);">${t.date || "—"}</td>
    </tr>
  `).join("");
}

// ── Dashboard ─────────────────────────────────
function updateDashboard() {
  const hr = new Date().getHours();
  document.getElementById("dash-greeting").textContent  = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const name = document.getElementById("sb-name").textContent || "Swimmer";
  document.getElementById("dash-username").textContent  = "Welcome back, " + name.split(" ")[0];
  document.getElementById("dash-date").textContent      = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  document.getElementById("stat-total").textContent     = times.length;
  document.getElementById("stat-prs").textContent       = times.filter(t => t.isPR).length;
  const doneG = goals.filter(g => g.done).length;
  document.getElementById("stat-goals").textContent     = goals.length ? `${doneG}/${goals.length}` : "0/0";

  const ec = {};
  times.forEach(t => ec[t.event] = (ec[t.event] || 0) + 1);
  const best = Object.entries(ec).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("stat-best").textContent = best ? best[0].replace("m ", "") : "—";

  // Recent times list
  const el = document.getElementById("dash-times-body");
  if (!times.length) {
    el.innerHTML = `<div class="empty-panel" style="padding:36px 16px;"><div class="empty-icon">⏱</div><div class="empty-text">No times logged yet.</div></div>`;
  } else {
    el.innerHTML = `<table class="data-table" style="font-size:12px;">
      <thead><tr><th>Event</th><th>Time</th><th>Pool</th></tr></thead>
      <tbody>${times.slice(0,5).map(t => `
        <tr>
          <td>${t.event}</td>
          <td><span class="mono" style="font-size:12px;">${t.timeStr}</span>${t.isPR ? '<span class="badge pr" style="font-size:9px;margin-left:4px;">PR</span>' : ""}</td>
          <td><span class="badge ${t.pool==="SCM"?"scm":"lcm"}" style="font-size:9px;">${t.pool}</span></td>
        </tr>`).join("")}
      </tbody></table>`;
  }

  // Snapshot
  document.getElementById("snap-club").textContent     = document.getElementById("p-club")?.value     || "—";
  document.getElementById("snap-level").textContent    = document.getElementById("p-level")?.value    || "—";
  document.getElementById("snap-stroke").textContent   = document.getElementById("p-stroke")?.value   || "—";
  document.getElementById("snap-training").textContent = document.getElementById("p-training")?.value || "—";
}

// ── Coach chat ────────────────────────────────
window.sendMsg = async function() {
  const inp  = document.getElementById("coach-input");
  const text = inp.value.trim();
  if (!text) return;
  inp.value = "";
  document.getElementById("coach-chips").style.display = "none";
  addChatMsg("user", text);
  await fetchBotReply(text);
};

window.sendChip = async function(text) {
  document.getElementById("coach-chips").style.display = "none";
  addChatMsg("user", text);
  await fetchBotReply(text);
};

function addChatMsg(role, text) {
  const wrap = document.getElementById("chat-msgs");
  const div  = document.createElement("div");
  div.className = "msg " + role;
  const av  = role === "bot" ? "AI" : (document.getElementById("sb-avatar").textContent || "Me");
  div.innerHTML = `<div class="msg-av">${av}</div><div class="msg-bbl">${text.replace(/\n/g, "<br>")}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

async function fetchBotReply(text) {
  const wrap   = document.getElementById("chat-msgs");
  const loader = document.createElement("div");
  loader.className = "msg bot";
  loader.innerHTML = `<div class="msg-av">AI</div><div class="msg-bbl"><div class="thinking-dots"><span></span><span></span><span></span></div></div>`;
  wrap.appendChild(loader);
  wrap.scrollTop = wrap.scrollHeight;

  const reply = await getCoachReply(text);
  wrap.removeChild(loader);
  addChatMsg("bot", reply);
}

// ── Analysis ──────────────────────────────────
window.runAnalysis = async function() {
  const stroke = document.getElementById("a-stroke").value;
  const dist   = document.getElementById("a-dist").value;
  const time   = document.getElementById("a-time").value;
  const notes  = document.getElementById("a-notes").value;
  if (!time) { alert("Please enter your time."); return; }

  document.getElementById("analysis-empty").style.display   = "none";
  document.getElementById("analysis-results").style.display = "none";
  document.getElementById("analysis-thinking").style.display = "block";

  const result = await getAnalysis(stroke, dist, time, notes);

  document.getElementById("analysis-thinking").style.display = "none";
  document.getElementById("analysis-results").style.display  = "flex";
  document.getElementById("analysis-results").style.flexDirection = "column";

  const score = result.score || 70;
  document.getElementById("a-score").textContent   = score;
  document.getElementById("a-grade").textContent   = result.grade || "Analysis Complete";
  document.getElementById("a-summary").textContent = result.summary || "";
  document.getElementById("a-insight").textContent = result.insights || "";

  const arc = document.getElementById("score-arc");
  arc.style.strokeDashoffset = "188.5";
  setTimeout(() => {
    arc.style.transition = "stroke-dashoffset 1s ease";
    arc.style.strokeDashoffset = String(188.5 - (188.5 * score / 100));
  }, 100);

  const colors = ["", "yellow", "green", "", "yellow"];
  document.getElementById("a-metrics").innerHTML = (result.metrics || []).map((m, i) =>
    `<div class="metric-row">
      <div class="metric-name">${m.name}</div>
      <div class="metric-track"><div class="metric-fill ${colors[i] || ""}" id="mf${i}" style="width:0%"></div></div>
      <div class="metric-val">${m.value}</div>
    </div>`
  ).join("");
  setTimeout(() => {
    (result.metrics || []).forEach((m, i) => {
      const el = document.getElementById("mf" + i);
      if (el) el.style.width = m.value + "%";
    });
  }, 200);
};

// ── Dryland ───────────────────────────────────
const STRETCHES = [
  { id:"s1", name:"Cross-Body Shoulder", muscle:"Shoulders / Rotator Cuff", time:"30s each side", tip:"Keep shoulder down, gently pull arm across chest. Essential before any stroke work.", color:"var(--cyan)",   svg:'<svg viewBox="0 0 120 110" width="110" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="16" r="10" fill="none" stroke="#39d0d8" stroke-width="2.5"/><line x1="60" y1="26" x2="60" y2="62" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="62" x2="44" y2="90" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="62" x2="76" y2="90" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="40" x2="96" y2="28" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/><circle cx="96" cy="28" r="5" fill="none" stroke="#2f81f7" stroke-width="2"/><path d="M86 20 Q96 15 103 26" fill="none" stroke="#2f81f7" stroke-width="1.5" stroke-linecap="round"/><line x1="60" y1="40" x2="28" y2="52" stroke="#39d0d8" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round"/></svg>' },
  { id:"s2", name:"Chest Opener",         muscle:"Pecs / Anterior Deltoid", time:"30s hold",       tip:"Clasp hands behind back, squeeze shoulder blades and lift chest upward.",            color:"var(--blue)",   svg:'<svg viewBox="0 0 120 110" width="110" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="16" r="10" fill="none" stroke="#39d0d8" stroke-width="2.5"/><line x1="60" y1="26" x2="60" y2="64" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="64" x2="44" y2="92" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="64" x2="76" y2="92" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="38" x2="18" y2="26" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="38" x2="102" y2="26" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/></svg>' },
  { id:"s3", name:"Hip Flexor Lunge",     muscle:"Hip Flexors / Quads",     time:"45s each side",  tip:"Keep torso tall, push hips forward. Critical for powerful kick mechanics.",           color:"var(--yellow)", svg:'<svg viewBox="0 0 120 110" width="110" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="58" cy="12" r="9" fill="none" stroke="#39d0d8" stroke-width="2.5"/><line x1="58" y1="21" x2="58" y2="52" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="58" y1="34" x2="38" y2="46" stroke="#39d0d8" stroke-width="2" stroke-linecap="round"/><line x1="58" y1="34" x2="78" y2="46" stroke="#39d0d8" stroke-width="2" stroke-linecap="round"/><line x1="58" y1="52" x2="38" y2="76" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="58" y1="52" x2="84" y2="66" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/><line x1="84" y1="66" x2="84" y2="96" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/><line x1="38" y1="76" x2="38" y2="96" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/></svg>' },
  { id:"s4", name:"Ankle Circles",        muscle:"Ankles / Calves",         time:"20 circles each",tip:"Draw large circles with your toes. Flexible ankles = a better flutter kick.",         color:"var(--green)",  svg:'<svg viewBox="0 0 120 110" width="110" height="100" xmlns="http://www.w3.org/2000/svg"><line x1="60" y1="8" x2="60" y2="52" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="52" x2="40" y2="72" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="52" x2="80" y2="72" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="40" y1="72" x2="40" y2="94" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="80" y1="72" x2="80" y2="88" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="80" cy="90" rx="14" ry="8" fill="none" stroke="#2f81f7" stroke-width="1.5" stroke-dasharray="4 2"/></svg>' },
  { id:"s5", name:"Lat Stretch Overhead", muscle:"Lats / Side Body",        time:"30s each side",  tip:"Raise one arm, lean away. Targets the catch and pull-through phase directly.",        color:"var(--cyan)",   svg:'<svg viewBox="0 0 120 110" width="110" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="16" r="10" fill="none" stroke="#39d0d8" stroke-width="2.5"/><line x1="60" y1="26" x2="60" y2="64" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="64" x2="44" y2="92" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="64" x2="76" y2="92" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="26" x2="98" y2="13" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/></svg>' },
  { id:"s6", name:"Neck Rolls",           muscle:"Neck / Upper Traps",      time:"60s slow",       tip:"Drop chin to chest, roll side to side gently. Never roll the head backward.",         color:"var(--text2)",  svg:'<svg viewBox="0 0 120 110" width="110" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="28" r="14" fill="none" stroke="#39d0d8" stroke-width="2.5"/><line x1="60" y1="42" x2="60" y2="68" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="68" x2="38" y2="96" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="68" x2="82" y2="96" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="54" x2="28" y2="54" stroke="#39d0d8" stroke-width="2" stroke-linecap="round"/><line x1="60" y1="54" x2="92" y2="54" stroke="#39d0d8" stroke-width="2" stroke-linecap="round"/></svg>' },
];

const DRYLAND = [
  { id:"d1", name:"Band Pull-Aparts",  muscle:"Rear Delts / Rotator Cuff",   time:"3 × 15 reps",    tip:"Light band, slow controlled movement. Directly trains the catch position.", color:"var(--blue)",   svg:'<svg viewBox="0 0 130 110" width="120" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="65" cy="16" r="10" fill="none" stroke="#39d0d8" stroke-width="2.5"/><line x1="65" y1="26" x2="65" y2="68" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="65" y1="68" x2="49" y2="98" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="65" y1="68" x2="81" y2="98" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="22" y1="42" x2="108" y2="42" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/><circle cx="22" cy="42" r="5" fill="none" stroke="#2f81f7" stroke-width="2"/><circle cx="108" cy="42" r="5" fill="none" stroke="#2f81f7" stroke-width="2"/></svg>' },
  { id:"d2", name:"Hollow Body Hold",  muscle:"Core / Hip Flexors",          time:"3 × 20s hold",   tip:"Lower back pressed to floor, arms overhead, legs raised 6 inches. Foundation of streamline.", color:"var(--cyan)", svg:'<svg viewBox="0 0 130 110" width="120" height="100" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="62" x2="118" y2="62" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><circle cx="65" cy="52" r="9" fill="none" stroke="#39d0d8" stroke-width="2.5"/><line x1="65" y1="62" x2="42" y2="82" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="65" y1="62" x2="88" y2="82" stroke="#39d0d8" stroke-width="2.5" stroke-linecap="round"/><line x1="65" y1="43" x2="40" y2="27" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/><line x1="65" y1="43" x2="90" y2="27" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/></svg>' },
  { id:"d3", name:"Squat Jumps",       muscle:"Quads / Glutes / Calves",     time:"4 × 10 reps",    tip:"Land softly, drop straight into next rep. Builds explosive push-off power from the wall.", color:"var(--green)", svg:'<svg viewBox="0 0 120 110" width="110" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="13" r="9" fill="none" stroke="#3fb950" stroke-width="2.5"/><line x1="60" y1="22" x2="60" y2="52" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="34" x2="40" y2="44" stroke="#3fb950" stroke-width="2" stroke-linecap="round"/><line x1="60" y1="34" x2="80" y2="44" stroke="#3fb950" stroke-width="2" stroke-linecap="round"/><line x1="60" y1="52" x2="42" y2="76" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="52" x2="78" y2="76" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="42" y1="76" x2="35" y2="98" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="78" y1="76" x2="85" y2="98" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/></svg>' },
  { id:"d4", name:"Plank Hold",        muscle:"Core / Shoulders / Glutes",   time:"3 × 30–60s",     tip:"Straight line head to heel. Squeeze glutes and brace core — essential for body position.", color:"var(--yellow)", svg:'<svg viewBox="0 0 130 110" width="120" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="44" r="9" fill="none" stroke="#3fb950" stroke-width="2.5"/><line x1="22" y1="53" x2="48" y2="62" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="48" y1="62" x2="108" y2="62" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="108" y1="62" x2="100" y2="82" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="108" y1="62" x2="116" y2="82" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/></svg>' },
  { id:"d5", name:"Mountain Climbers", muscle:"Core / Hip Flexors / Cardio", time:"3 × 30s",        tip:"Drive knees to chest alternately. Mimics the leg drive rhythm of freestyle.",       color:"var(--red)",    svg:'<svg viewBox="0 0 130 110" width="120" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="38" r="9" fill="none" stroke="#3fb950" stroke-width="2.5"/><line x1="20" y1="47" x2="46" y2="56" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="46" y1="56" x2="104" y2="56" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="104" y1="56" x2="96" y2="76" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="104" y1="56" x2="112" y2="76" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="64" y1="56" x2="58" y2="36" stroke="#2f81f7" stroke-width="2.5" stroke-linecap="round"/></svg>' },
  { id:"d6", name:"Pull-Ups",          muscle:"Lats / Biceps / Rear Delts",  time:"4 × 6–10 reps",  tip:"Full range of motion. The single best dryland exercise — trains the entire pull.",   color:"var(--purple)", svg:'<svg viewBox="0 0 120 110" width="110" height="100" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="10" x2="102" y2="10" stroke="#484f58" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="34" r="10" fill="none" stroke="#3fb950" stroke-width="2.5"/><line x1="60" y1="24" x2="44" y2="12" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="24" x2="76" y2="12" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="44" x2="60" y2="76" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="76" x2="50" y2="96" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><line x1="60" y1="76" x2="70" y2="96" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/></svg>' },
];

window.switchDrylandTab = function(tab, el) {
  currentDrylandTab = tab;
  document.querySelectorAll(".dryland-tab").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  renderDrylandTab();
};

function renderDrylandTab() {
  const items = currentDrylandTab === "stretches" ? STRETCHES : DRYLAND;
  const grid  = document.getElementById("exercise-grid");
  grid.innerHTML = items.map(item => {
    const isDone = drylandDone[item.id];
    return `
      <div class="exercise-card" style="border-color:${isDone ? item.color : "var(--border)"};">
        ${isDone ? '<div class="exercise-done-check">✓</div>' : ""}
        <div class="exercise-illus" style="opacity:${isDone ? ".7" : "1"};">${item.svg}</div>
        <div class="exercise-name">${item.name}</div>
        <div class="exercise-muscle" style="color:${item.color};">${item.muscle}</div>
        <div class="exercise-footer">
          <span class="exercise-time">${item.time}</span>
          <div class="exercise-btns">
            <button class="ex-btn" onclick="toggleTip('${item.id}')">▾ tip</button>
            <button class="ex-btn ex-done-btn${isDone ? " done" : ""}" onclick="toggleExercise('${item.id}')">${isDone ? "✓ Done" : "Mark done"}</button>
          </div>
        </div>
        <div class="exercise-tip" id="etip-${item.id}">💡 ${item.tip}</div>
      </div>`;
  }).join("");
  updateDrylandProgress();
}

window.toggleTip = function(id) {
  const tip     = document.getElementById("etip-" + id);
  const visible = tip.classList.toggle("visible");
  const btn     = tip.previousElementSibling.querySelector(".ex-btn");
  if (btn) btn.textContent = visible ? "▴ less" : "▾ tip";
};

window.toggleExercise = function(id) {
  drylandDone[id] = !drylandDone[id];
  renderDrylandTab();
  updateAchBadge();
};

function updateDrylandProgress() {
  const all  = [...STRETCHES, ...DRYLAND];
  const done = all.filter(i => drylandDone[i.id]).length;
  const pct  = Math.round(done / all.length * 100);
  document.getElementById("dryland-pct").textContent   = pct + "%";
  document.getElementById("dryland-count").textContent = `${done}/${all.length} complete`;
  document.getElementById("dryland-bar").style.width   = pct + "%";
}

// ── Achievements ──────────────────────────────
const ACHIEVEMENTS = [
  { id:"a1",  icon:"🏊", name:"First Stroke",      desc:"Log your very first swim time",         color:"#39d0d8", check:() => times.length >= 1 },
  { id:"a2",  icon:"⭐", name:"Hat Trick",          desc:"Log 3 or more times",                   color:"#d29922", check:() => times.length >= 3 },
  { id:"a3",  icon:"🥇", name:"PR Hunter",          desc:"Earn your first Personal Record",        color:"#d29922", check:() => times.some(t => t.isPR) },
  { id:"a4",  icon:"🔥", name:"On Fire",            desc:"Log 10 or more times",                  color:"#f85149", check:() => times.length >= 10 },
  { id:"a5",  icon:"🎯", name:"Goal Setter",        desc:"Create your first goal",                color:"#2f81f7", check:() => goals.length >= 1 },
  { id:"a6",  icon:"✅", name:"Goal Crusher",       desc:"Complete a goal",                       color:"#3fb950", check:() => goals.some(g => g.done) },
  { id:"a7",  icon:"🌊", name:"All-Rounder",        desc:"Log times in 4 different events",       color:"#39d0d8", check:() => new Set(times.map(t => t.event)).size >= 4 },
  { id:"a8",  icon:"💪", name:"Dryland Devotee",    desc:"Complete a dryland workout",            color:"#a371f7", check:() => Object.keys(drylandDone).some(k => k.startsWith("d") && drylandDone[k]) },
  { id:"a9",  icon:"🧘", name:"Stretch Star",       desc:"Complete a stretching session",         color:"#3fb950", check:() => Object.keys(drylandDone).some(k => k.startsWith("s") && drylandDone[k]) },
  { id:"a10", icon:"📋", name:"Profile Pro",        desc:"Fill in your swimmer profile",          color:"#2f81f7", check:() => !!(document.getElementById("p-club")?.value) },
  { id:"a11", icon:"🏆", name:"PR Machine",         desc:"Earn 5 or more Personal Records",       color:"#d29922", check:() => times.filter(t => t.isPR).length >= 5 },
  { id:"a12", icon:"🚀", name:"Elite Swimmer",      desc:"Log 25 or more times",                  color:"#f85149", check:() => times.length >= 25 },
];

function renderAchievements() {
  const unlocked = ACHIEVEMENTS.filter(a => a.check());
  const locked   = ACHIEVEMENTS.filter(a => !a.check());

  document.getElementById("ach-unlock-label").textContent = `${unlocked.length} of ${ACHIEVEMENTS.length} achievements unlocked`;

  const preview = document.getElementById("ach-preview-icons");
  preview.innerHTML = unlocked.slice(0, 6).map(a => `<span title="${a.name}" style="font-size:20px;">${a.icon}</span>`).join("");
  if (unlocked.length > 6) preview.innerHTML += `<span style="font-size:12px;color:var(--text3);">+${unlocked.length - 6}</span>`;

  if (unlocked.length) {
    document.getElementById("ach-unlocked-section").style.display = "block";
    document.getElementById("ach-empty").style.display = "none";
    document.getElementById("ach-unlocked-label").textContent = `Unlocked — ${unlocked.length}`;
    document.getElementById("ach-unlocked-grid").innerHTML = unlocked.map(a =>
      `<div class="ach-card" style="border-color:${a.color}33;">
        <div class="ach-icon" style="filter:drop-shadow(0 0 8px ${a.color}88);">${a.icon}</div>
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
        <div class="ach-pill" style="background:${a.color}22;color:${a.color};">UNLOCKED</div>
      </div>`
    ).join("");
  } else {
    document.getElementById("ach-unlocked-section").style.display = "none";
    document.getElementById("ach-empty").style.display = "flex";
  }

  document.getElementById("ach-locked-label").textContent = `Locked — ${locked.length}`;
  document.getElementById("ach-locked-grid").innerHTML = locked.map(a =>
    `<div class="ach-card locked">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>
      <div class="ach-pill" style="background:var(--surface2);color:var(--text3);">LOCKED</div>
    </div>`
  ).join("");
}

function updateAchBadge() {
  const count = ACHIEVEMENTS.filter(a => a.check()).length;
  const badge = document.getElementById("ach-badge");
  if (count > 0) { badge.textContent = count; badge.style.display = "inline-block"; }
  else badge.style.display = "none";
}

// ── Goals ─────────────────────────────────────
window.switchAchTab = function(tab, el) {
  document.querySelectorAll(".ach-tab").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("ach-panel").style.display   = tab === "achievements" ? "block" : "none";
  document.getElementById("goals-panel").style.display = tab === "goals"        ? "block" : "none";
  if (tab === "goals") renderGoals();
};

window.addGoal = function() {
  const title  = document.getElementById("g-title").value.trim();
  if (!title) { alert("Enter a goal title."); return; }
  const target = document.getElementById("g-target").value;
  const by     = document.getElementById("g-by").value;
  const type   = document.getElementById("g-type").value;
  goals.push({ id: Date.now(), title, target, by, type, done: false });
  document.getElementById("g-title").value  = "";
  document.getElementById("g-target").value = "";
  document.getElementById("g-by").value     = "";
  renderGoals();
  updateDashboard();
  updateAchBadge();
};

window.quickGoal = function(title) {
  document.getElementById("g-title").value = title;
};

window.toggleGoal = function(id) {
  const g = goals.find(g => g.id === id);
  if (g) g.done = !g.done;
  renderGoals();
  updateDashboard();
  updateAchBadge();
};

window.deleteGoal = function(id) {
  goals = goals.filter(g => g.id !== id);
  renderGoals();
  updateDashboard();
  updateAchBadge();
};

function renderGoals() {
  const active = goals.filter(g => !g.done);
  const done   = goals.filter(g => g.done);
  const empty         = document.getElementById("goals-empty");
  const activeSection = document.getElementById("active-goals-section");
  const doneSection   = document.getElementById("done-goals-section");

  if (!goals.length) {
    empty.style.display = "flex"; activeSection.style.display = "none"; doneSection.style.display = "none";
    return;
  }
  empty.style.display = "none";

  if (active.length) {
    activeSection.style.display = "block";
    document.getElementById("active-label").textContent = `Active — ${active.length}`;
    document.getElementById("active-goals-list").innerHTML = active.map(g =>
      `<div class="goal-item">
        <button class="goal-check" onclick="toggleGoal(${g.id})">✓</button>
        <div style="flex:1;">
          <div class="goal-title">${g.title}</div>
          <div class="goal-meta">
            ${g.target ? `<span class="goal-target">Target: ${g.target}</span>` : ""}
            ${g.by     ? `<span class="goal-by">By: ${g.by}</span>`             : ""}
          </div>
        </div>
        <button class="goal-delete" onclick="deleteGoal(${g.id})">×</button>
      </div>`
    ).join("");
  } else { activeSection.style.display = "none"; }

  if (done.length) {
    doneSection.style.display = "block";
    document.getElementById("done-label").textContent = `Completed — ${done.length}`;
    document.getElementById("done-goals-list").innerHTML = done.map(g =>
      `<div class="goal-item done-item">
        <button class="goal-check checked" onclick="toggleGoal(${g.id})">✓</button>
        <div style="flex:1;">
          <div class="goal-title done-title">${g.title}</div>
          ${g.target ? `<span class="goal-target">Achieved: ${g.target}</span>` : ""}
        </div>
        <button class="goal-delete" onclick="deleteGoal(${g.id})">×</button>
      </div>`
    ).join("");
  } else { doneSection.style.display = "none"; }
}

// ── Toast ─────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById("save-toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
