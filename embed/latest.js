// JavaScript Document

const qs = new URLSearchParams(location.search);
const filter = {
  q: (qs.get("q") || "").trim().toLowerCase(),
  pref: qs.get("pref") || "",
  genre: qs.get("genre") || "",
  r18: qs.get("r18") === "1",
  weekend: qs.get("weekend") === "1",
  sort: qs.get("sort") || "new"
};

const listEl = document.getElementById("list");
const updatedEl = document.getElementById("u");

function norm(s){ return (s ?? "").toString().toLowerCase(); }
function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function popKey(id){ return `pop_${id}`; }
function getPop(id){ return Number(localStorage.getItem(popKey(id)) || "0"); }
function incPop(id){ localStorage.setItem(popKey(id), String(getPop(id)+1)); }

function getThisWeekendRange(){
  const now = new Date();
  const day = now.getDay();
  const toSat = (6 - day + 7) % 7;
  const sat = new Date(now);
  sat.setHours(0,0,0,0);
  sat.setDate(now.getDate() + toSat);

  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(23,59,59,999);

  return { sat, sun };
}

function pass(e){
  if (!filter.r18 && e.rating === "r18") return false;
  if (filter.pref && e.pref !== filter.pref) return false;
  if (filter.genre && !(e.genres||[]).includes(filter.genre)) return false;

  if (filter.weekend){
    if (!e.start_ts) return false;
    const { sat, sun } = getThisWeekendRange();
    const t = e.start_ts * 1000;
    if (t < sat.getTime() || t > sun.getTime()) return false;
  }

  if (filter.q){
    const hay = norm([e.title, e.organizer, e.city, e.venue, (e.tags||[]).join(" ")].join(" "));
    if (!hay.includes(filter.q)) return false;
  }
  return true;
}

function card(e){
  const badges = [(e.rating === "r18" ? "R18" : "全年齢"), ...(e.tags||[])];
  return `
    <div class="card">
      <div class="t">${escapeHtml(e.title)}</div>
      <div class="m">
        <span>${escapeHtml(e.start_date || e.date || "")}</span>
        <span>${escapeHtml(e.pref || "未設定")}</span>
      </div>
      <div class="badges">
        ${badges.map(b=>`<span class="badge">${escapeHtml(b)}</span>`).join("")}
      </div>
      <a class="btn js-out" data-id="${escapeHtml(e.id)}" href="${e.official_url}" target="_blank" rel="nofollow noopener">公式へ</a>
    </div>
  `;
}

async function load(){
  const res = await fetch("../api/latest.json", { cache:"no-store" });
  const json = await res.json();
  updatedEl.textContent = `更新: ${json.last_updated || "-"}`;

  let items = (json.items || []).filter(pass);

  if (filter.sort === "pop"){
    items.sort((a,b)=> getPop(b.id) - getPop(a.id));
  } else {
    items.sort((a,b)=> (b.start_ts||0) - (a.start_ts||0));
  }

  listEl.innerHTML = items.length ? items.map(card).join("") : `<div class="muted">データがありません</div>`;
}

load();
setInterval(load, 30000);

document.addEventListener("click", (ev)=>{
  const a = ev.target.closest("a.js-out");
  if (!a) return;
  const id = a.getAttribute("data-id");
  if (!id) return;
  incPop(id);
  setTimeout(load, 50);
});
