const API = "/api";
let token = sessionStorage.getItem("ww_token") || "";
let currentUser = null;
let authMode = "signin";
let logs = [];
let isAdmin = false;
const $ = (id) => document.getElementById(id);
const today = new Date();
$("todayLabel").textContent = today.toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"});
$("logDate").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

async function api(path, options = {}) {
  const headers = {"Content-Type":"application/json", ...(options.headers || {})};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, {...options, headers});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) { signOut(false); }
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}
function message(id, text, error = false) {
  const el = $(id); if (!el) return;
  el.textContent = text; el.classList.toggle("error", error);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showGlobal(text) {
  const el = $("globalMessage"); el.textContent = text; el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3500);
}
function showView(view) {
  document.querySelectorAll(".view").forEach(el => el.classList.add("hidden"));
  const target = $(`${view}View`);
  if (target && (view !== "admin" || isAdmin)) target.classList.remove("hidden");
  document.querySelectorAll("[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  if (view === "history") renderHistory();
  if (view === "admin") loadAdmin();
  window.scrollTo({top:0, behavior:"smooth"});
}
document.querySelectorAll("[data-view]").forEach(el => el.addEventListener("click", () => showView(el.dataset.view)));
$("showAuth").addEventListener("click", () => $("authPanel").classList.remove("hidden"));
$("heroAdd").addEventListener("click", () => { if (!token) { $("authPanel").classList.remove("hidden"); return; } $("logForm").scrollIntoView({behavior:"smooth",block:"center"}); $("category").focus(); });
$("closeAuth").addEventListener("click", () => $("authPanel").classList.add("hidden"));
document.querySelectorAll("[data-auth]").forEach(el => el.addEventListener("click", () => setAuthMode(el.dataset.auth)));
$("refreshAdmin").addEventListener("click", loadAdmin);
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll("[data-auth]").forEach(el => el.classList.toggle("active", el.dataset.auth === mode));
  $("authTitle").textContent = mode === "signin" ? "Sign in to WaterWise" : "Create your account";
  $("authSubmit").textContent = mode === "signin" ? "Sign in" : "Create account";
  $("authPassword").autocomplete = mode === "signin" ? "current-password" : "new-password";
  $("authHint").textContent = mode === "signin" ? "Use your account to save and review your water logs." : "Use a valid email and a password of at least 8 characters.";
  message("authMessage", "");
}
$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault(); message("authMessage", "");
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  $("authSubmit").disabled = true;
  try {
    const data = await api(`/auth/${authMode}`, {method:"POST", body:JSON.stringify({email,password})});
    if (authMode === "signup" && !data.access_token) {
      message("authMessage", "Account created. Check your email to confirm it, then sign in.");
      return;
    }
    token = data.access_token; sessionStorage.setItem("ww_token", token);
    $("authPanel").classList.add("hidden"); $("authForm").reset();
    await loadSession(); showGlobal("Welcome to WaterWise!");
  } catch (err) { message("authMessage", err.message, true); }
  finally { $("authSubmit").disabled = false; }
});
async function signOut(showMessage = true) {
  token = ""; currentUser = null; isAdmin = false; logs = []; sessionStorage.removeItem("ww_token");
  updateAccount(); renderDashboard(); renderHistory();
  if (showMessage) showGlobal("You have signed out.");
}
function updateAccount() {
  const area = $("accountArea");
  if (!currentUser) { area.innerHTML = '<button class="btn btn-primary" id="showAuth">Sign in</button>'; $("showAuth").addEventListener("click", () => $("authPanel").classList.remove("hidden")); $("adminNav").classList.add("hidden"); return; }
  area.innerHTML = `<span class="muted small">${escapeHtml(currentUser.email)}</span> <button class="btn btn-outline btn-small" id="signOutBtn">Sign out</button>`;
  $("signOutBtn").addEventListener("click", () => signOut());
  $("adminNav").classList.toggle("hidden", !isAdmin);
}
async function loadSession() {
  if (!token) { updateAccount(); renderDashboard(); renderHistory(); return; }
  try {
    const data = await api("/auth/me"); currentUser = data.user; isAdmin = data.user.role === "admin";
    updateAccount();
    const result = await api("/logs"); logs = result.logs || [];
    renderDashboard(); renderHistory();
  } catch (err) {
    if (token) showGlobal(err.message);
    await signOut(false);
  }
}
function iconFor(category) {
  return ({Drinking:"🥤",Cooking:"🍲",Bathing:"🚿",Laundry:"🧺",Cleaning:"🧽",Gardening:"🌱",Dishwashing:"🍽️",Other:"💧"})[category] || "💧";
}
function dateText(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }
function renderLogItem(log) {
  return `<div class="log-item"><div class="log-symbol">${iconFor(log.category)}</div><div class="log-main"><strong>${escapeHtml(log.category)}</strong><small>${dateText(log.log_date)}${log.notes ? " · " + escapeHtml(log.notes) : ""}</small></div><div class="log-amount">${Number(log.litres).toLocaleString(undefined,{maximumFractionDigits:1})} L</div></div>`;
}
function renderDashboard() {
  if (!currentUser) {
    $("todayTotal").textContent = "—"; $("weekTotal").textContent = "—"; $("entryCount").textContent = "—";
    $("recentLogs").innerHTML = '<div class="empty-state">Sign in to save and review your water logs.</div>'; return;
  }
  const now = new Date(); const localToday = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const weekStart = new Date(now); weekStart.setDate(now.getDate()-6); weekStart.setHours(0,0,0,0);
  const todayTotal = logs.filter(l => l.log_date === localToday).reduce((sum,l)=>sum+Number(l.litres),0);
  const weekTotal = logs.filter(l => new Date(`${l.log_date}T12:00:00`) >= weekStart).reduce((sum,l)=>sum+Number(l.litres),0);
  $("todayTotal").textContent = `${todayTotal.toLocaleString(undefined,{maximumFractionDigits:1})} L`;
  $("weekTotal").textContent = `${weekTotal.toLocaleString(undefined,{maximumFractionDigits:1})} L`;
  $("entryCount").textContent = logs.length.toLocaleString();
  $("recentLogs").innerHTML = logs.slice(0,4).map(renderLogItem).join("") || '<div class="empty-state">No water logs yet. Add your first entry.</div>';
}
$("logForm").addEventListener("submit", async (event) => {
  event.preventDefault(); message("logMessage","");
  if (!token) { message("logMessage","Please sign in before saving a water log.",true); $("authPanel").classList.remove("hidden"); return; }
  const payload = {category:$("category").value, litres:Number($("litres").value), log_date:$("logDate").value, notes:$("notes").value.trim()};
  try {
    const result = await api("/logs",{method:"POST",body:JSON.stringify(payload)});
    logs.unshift(result.log); logs.sort((a,b)=>b.log_date.localeCompare(a.log_date)||b.created_at.localeCompare(a.created_at));
    $("logForm").reset(); $("logDate").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    renderDashboard(); renderHistory(); message("logMessage","Water log saved successfully.");
  } catch (err) { message("logMessage",err.message,true); }
});
function renderHistory() {
  if (!currentUser) { $("historyLogs").innerHTML = '<p class="empty-state">Sign in to see your history.</p>'; return; }
  const query = $("historySearch").value.trim().toLowerCase();
  const category = $("historyCategory").value;
  const filtered = logs.filter(l => (!category || l.category === category) && (!query || (l.notes || "").toLowerCase().includes(query) || l.category.toLowerCase().includes(query)));
  if (!filtered.length) { $("historyLogs").innerHTML = '<p class="empty-state">No matching water logs found.</p>'; return; }
  $("historyLogs").innerHTML = `<table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Notes</th><th>Action</th></tr></thead><tbody>${filtered.map(l=>`<tr><td>${dateText(l.log_date)}</td><td>${escapeHtml(l.category)}</td><td><strong>${Number(l.litres).toLocaleString(undefined,{maximumFractionDigits:1})} L</strong></td><td class="notes-cell">${escapeHtml(l.notes || "—")}</td><td><button class="delete-btn" data-delete="${escapeHtml(l.id)}">Delete</button></td></tr>`).join("")}</tbody></table>`;
  document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Delete this water log? This cannot be undone.")) return;
    try { await api(`/logs/${encodeURIComponent(btn.dataset.delete)}`,{method:"DELETE"}); logs = logs.filter(l=>l.id !== btn.dataset.delete); renderDashboard(); renderHistory(); showGlobal("Water log deleted."); }
    catch(err) { showGlobal(err.message); }
  }));
}
$("historySearch").addEventListener("input",renderHistory);
$("historyCategory").addEventListener("change",renderHistory);
$("suggestionForm").addEventListener("submit",async (event)=>{
  event.preventDefault(); message("suggestionMessage","");
  if (!token) { message("suggestionMessage","Please sign in before submitting a suggestion.",true); $("authPanel").classList.remove("hidden"); return; }
  try { await api("/suggestions",{method:"POST",body:JSON.stringify({content:$("suggestionText").value.trim()})}); $("suggestionForm").reset(); message("suggestionMessage","Thanks! Your suggestion has been submitted."); }
  catch(err) { message("suggestionMessage",err.message,true); }
});
async function loadAdmin() {
  if (!isAdmin) return;
  $("adminSuggestions").innerHTML = '<div class="empty-state">Loading suggestions…</div>';
  try {
    const data = await api("/admin/suggestions");
    $("adminSuggestions").innerHTML = data.suggestions.length ? data.suggestions.map(s=>`<article class="suggestion-item"><strong>${escapeHtml(s.email || "User")}</strong><small class="muted"> · ${new Date(s.created_at).toLocaleString()}</small><p>${escapeHtml(s.content)}</p></article>`).join("") : '<div class="empty-state">No suggestions have been submitted yet.</div>';
  } catch(err) { $("adminSuggestions").innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
}
loadSession();
