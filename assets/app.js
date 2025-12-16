// JavaScript Document


const PREFS = [
  "北海道","青森","岩手","宮城","秋田","山形","福島",
  "茨城","栃木","群馬","埼玉","千葉","東京","神奈川",
  "新潟","富山","石川","福井","山梨","長野",
  "岐阜","静岡","愛知","三重",
  "滋賀","京都","大阪","兵庫","奈良","和歌山",
  "鳥取","島根","岡山","広島","山口",
  "徳島","香川","愛媛","高知",
  "福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄"
];

const $ = (id) => document.getElementById(id);

const state = {
  data: [],
  q: "",
  pref: "",
  genre: "",
  r18: false,

  sort: "new",          // new / pop
  weekendOnly: false,   // 今週末だけ

  ageOk: localStorage.getItem("age_ok") === "1",
};

function fillPrefs(){
  const sel = $("pref");
  PREFS.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  });
}

function openAgeGate(){
  const modal = $("ageGate");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}
function closeAgeGate(){
  const modal = $("ageGate");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}
function ensureAgeGate(){
  if (!state.ageOk) openAgeGate();
}

function norm(s){ return (s ?? "").toString().toLowerCase(); }

function popKey(id){ return `pop_${id}`; }
function getPop(id){ return Number(localStorage.getItem(popKey(id)) || "0"); }
function incPop(id){
  localStorage.setItem(popKey(id), String(getPop(id) + 1));
}

function getThisWeekendRange(){
  const now = new Date();
  const day = now.getDay(); // 0=日 6=土
  const toSat = (6 - day + 7) % 7;
  const sat = new Date(now);
  sat.setHours(0,0,0,0);
  sat.setDate(now.getDate() + toSat);

  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(23,59,59,999);

  return { sat, sun };
}

function inWeekend(e){
  if (!state.weekendOnly) return true;
  if (!e.start_ts) return false; // 日付不明は除外（週末抽出の精度優先）
  const { sat, sun } = getThisWeekendRange();
  const t = e.start_ts * 1000;
  return (t >= sat.getTime() && t <= sun.getTime());
}

function passFilters(e){
  if (!inWeekend(e)) return false;
  if (!state.r18 && e.rating === "r18") return false;

  if (state.pref && e.pref !== state.pref) return false;
  if (state.genre && !(e.genres || []).includes(state.genre)) return false;

  if (state.q){
    const q = norm(state.q);
    const hay = norm([e.title, e.organizer, e.city, e.venue, (e.tags||[]).join(" ")].join(" "));
    if (!hay.includes(q)) return false;
  }
  return true;
}

function escapeHtml(str){
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function cardHTML(e){
  const isR18 = e.rating === "r18";
  const hideR18 = isR18 && !state.r18;
  const blurClass = (isR18 && state.r18 && !state.ageOk) ? "blur" : "";
  const dimClass = hideR18 ? "dim" : "";

  const badges = [
    isR18 ? "R18" : "全年齢",
    ...(e.tags || [])
  ];

  const link = e.official_url; // 収集側でアフィ変換済みにしておく

  return `
    <article class="card ${dimClass}">
      <div class="card__title ${blurClass}">${escapeHtml(e.title)}</div>
      <div class="card__meta ${blurClass}">
        <span>${escapeHtml(e.start_date || e.date || "")}</span>
        <span>${escapeHtml(e.pref || "未設定")}${e.city ? " / " + escapeHtml(e.city) : ""}</span>
        ${e.price ? `<span>¥${escapeHtml(e.price)}</span>` : ""}
      </div>

      <div class="badges ${blurClass}">
        ${badges.map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
      </div>

      <div class="actions">
        <a class="btn primary js-out" data-id="${escapeHtml(e.id)}" href="${link}" target="_blank" rel="nofollow noopener">公式へ</a>
      </div>

      ${isR18 && state.r18 && !state.ageOk ? `<p class="small">※R18表示には年齢確認が必要です。</p>` : ""}
    </article>
  `;
}

function render(){
  const list = $("list");
  const filtered = state.data.filter(passFilters);

  // 並び替え
  if (state.sort === "pop"){
    filtered.sort((a,b)=> getPop(b.id) - getPop(a.id));
  } else {
    filtered.sort((a,b)=> (b.start_ts||0) - (a.start_ts||0));
  }

  list.innerHTML = filtered.length
    ? filtered.map(cardHTML).join("")
    : `<div class="small">条件に一致する情報がありません。</div>`;

  // embedへフィルターを渡す（URLクエリ）
  const params = new URLSearchParams({
    q: state.q,
    pref: state.pref,
    genre: state.genre,
    r18: state.r18 ? "1" : "0",
    weekend: state.weekendOnly ? "1" : "0",
    sort: state.sort
  });
  $("embedFrame").src = `./embed/latest.html?${params.toString()}`;
}

async function load(){
  const res = await fetch("./api/latest.json", { cache: "no-store" });
  const json = await res.json();

  state.data = json.items || [];
  $("updated").textContent = `最終更新: ${json.last_updated || "-"}`;
  render();
}

function bind(){
  $("q").addEventListener("input", (e)=>{ state.q = e.target.value.trim(); render(); });
  $("pref").addEventListener("change", (e)=>{ state.pref = e.target.value; render(); });
  $("genre").addEventListener("change", (e)=>{ state.genre = e.target.value; render(); });

  $("sort").addEventListener("change", (e)=>{
    state.sort = e.target.value;
    render();
  });

  $("weekend").addEventListener("click", ()=>{
    state.weekendOnly = !state.weekendOnly;
    $("weekend").textContent = state.weekendOnly ? "今週末だけ（解除）" : "今週末だけ";
    render();
  });

  $("r18").addEventListener("change", (e)=>{
    state.r18 = e.target.checked;
    if (state.r18) ensureAgeGate();
    render();
  });

  $("reset").addEventListener("click", ()=>{
    state.q=""; state.pref=""; state.genre=""; state.r18=false;
    state.sort="new"; state.weekendOnly=false;

    $("q").value=""; $("pref").value=""; $("genre").value="";
    $("r18").checked=false; $("sort").value="new";
    $("weekend").textContent="今週末だけ";

    render();
  });

  $("ageYes").addEventListener("click", ()=>{
    state.ageOk = true;
    localStorage.setItem("age_ok", "1");
    closeAgeGate();
    render();
  });

  $("ageNo").addEventListener("click", ()=>{
    state.ageOk = false;
    localStorage.removeItem("age_ok");
    state.r18 = false;
    $("r18").checked = false;
    closeAgeGate();
    render();
  });

  // クリック人気計測
  document.addEventListener("click", (ev)=>{
    const a = ev.target.closest("a.js-out");
    if (!a) return;
    const id = a.getAttribute("data-id");
    if (!id) return;
    incPop(id);
    setTimeout(render, 50);
  });
}

fillPrefs();
bind();
load();
