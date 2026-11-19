/* =========================================================
   보통날의 우리집 — app.js
   · 모든 기록은 이 기기 브라우저(localStorage)에만 저장됩니다.
   · 시간표·급식·네이버 공유 일정은 암호화된 볼트(data/family-vault.enc.json)에
     들어 있고, PIN을 넣어야 Web Crypto로 풀려 메모리에만 올라갑니다.
   · 날씨: Open-Meteo 무료 API (키 불필요)
   ========================================================= */
'use strict';

/* ---------------- 기본 상수 ---------------- */
const STORAGE_KEY = 'urijip-dashboard-v1';
const PIN_LOCK_KEY = 'urijip-pin-lock-v1';
const PIN_ITERATIONS = 150000;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const EVENT_COLORS = ['#F2A9B8', '#8FB8E8', '#E8C87A', '#9CD3B2', '#B9A6E6', '#F0A98A'];

/* 네이버 공유 캘린더 일정 — 잠금을 풀 때 볼트에서 꺼내 메모리에만 둡니다. */
let NAVER_CAL = null;
const NAVER_COLOR = '#03C75A';
const SAMPLE_MEMOS = { '주말 가족 나들이': '가까운 공원에 다녀오기', '장보기': '냉장고 채우기' };

const STATUS_PRESETS = [
  '집에 있어요', '외출 중!', '일하는 중!', '학교/학원에 있어요',
  '운동 중!', '집에서 쉬는 중!', '잠깐 나갔어요', '식사 중!'
];

/* 위치 기본값은 '서울'입니다. 화면의 📍 버튼에서 우리 동네로 바꿔 두세요. */
const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.9780, label: '서울' };

const WMO = {
  0: ['맑음', '☀️'], 1: ['대체로 맑음', '🌤'], 2: ['구름 조금', '⛅️'], 3: ['흐림', '☁️'],
  45: ['안개', '🌫'], 48: ['안개', '🌫'],
  51: ['이슬비', '🌦'], 53: ['이슬비', '🌦'], 55: ['이슬비', '🌦'],
  56: ['어는 이슬비', '🌧'], 57: ['어는 이슬비', '🌧'],
  61: ['비', '🌧'], 63: ['비', '🌧'], 65: ['강한 비', '🌧'],
  66: ['어는 비', '🌧'], 67: ['어는 비', '🌧'],
  71: ['눈', '🌨'], 73: ['눈', '🌨'], 75: ['많은 눈', '❄️'], 77: ['싸락눈', '🌨'],
  80: ['소나기', '🌦'], 81: ['소나기', '🌦'], 82: ['강한 소나기', '⛈'],
  85: ['눈 소나기', '🌨'], 86: ['눈 소나기', '🌨'],
  95: ['천둥번개', '⛈'], 96: ['천둥번개', '⛈'], 99: ['천둥번개', '⛈']
};

const DINNER_POOL = [
  '김치찌개', '된장찌개', '순두부찌개', '부대찌개', '제육볶음', '불고기', '카레라이스',
  '비빔밥', '잡채', '닭갈비', '삼겹살 구이', '미역국', '오므라이스', '볶음밥',
  '계란말이', '떡볶이', '닭볶음탕', '마파두부', '생선구이', '우동', '만두국',
  '청국장', '갈비탕', '냉면', '파스타', '치킨 샐러드', '돈코츠 라멘', '감자탕'
];

const ADVENTURES = [
  { emoji: '🎲', title: '보드게임 한 판', desc: '가족 모두 둘러앉아 한 판! 진 사람이 간식 준비하기.' },
  { emoji: '🚶', title: '동네 산책 20분', desc: '가까운 공원까지 걸어가서 하늘 사진 한 장 찍어 오기.' },
  { emoji: '🍪', title: '쿠키 같이 굽기', desc: '초코칩 쿠키 반죽부터 함께 만들고 오븐 앞에서 기다리기.' },
  { emoji: '🎨', title: '이어 그리기', desc: '한 사람이 한 획씩 이어서 그림 완성하기. 제목도 붙여 보기.' },
  { emoji: '🗣', title: '끝말잇기 10판', desc: '두 글자 이상만, 시간 제한 5초. 벌칙은 물 마시기.' },
  { emoji: '🎬', title: '가족 영화의 밤', desc: '팝콘 준비하고 모두가 고른 영화 한 편 보기.' },
  { emoji: '🧩', title: '퍼즐 100조각', desc: '조각을 나눠 맡고 30분 안에 맞춰 보기.' },
  { emoji: '📚', title: '책 한 권 같이 읽기', desc: '각자 10분 읽고 재미있는 장면 하나씩 말해 주기.' },
  { emoji: '🧹', title: '10분 정리 미션', desc: '타이머 10분, 각자 방 하나씩 정리하고 칭찬해 주기.' },
  { emoji: '🌙', title: '별 보기', desc: '베란다에서 오늘 보이는 별 세어 보기. 손전등 챙기기.' },
  { emoji: '🍳', title: '아이 셰프의 날', desc: '아이가 메뉴를 정하고 어른은 도우미로만 돕기.' },
  { emoji: '💌', title: '서로에게 편지', desc: '가족 우체통에 오늘 고마웠던 일 한 줄씩 남기기.' }
];

const LEVELS = [
  { min: 0, name: '새싹', emoji: '🌱' },
  { min: 6, name: '나무', emoji: '🌳' },
  { min: 14, name: '꽃', emoji: '🌷' },
  { min: 26, name: '별', emoji: '⭐' }
];

/* ---------------- 작은 도우미 ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const todayISO = () => isoDate(new Date());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const nextDOW = (d, dow) => { const x = new Date(d); let i = 0; while (x.getDay() !== dow && i < 7) { x.setDate(x.getDate() + 1); i++; } return x; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function relTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.round(h / 24);
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

function shortDate(s) {
  if (!s) return '';
  const d = parseISO(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function mdLabel(s) {
  const d = parseISO(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
}

function hourLabel(h) {
  const ap = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${hh}시`;
}

/* ---------------- 상태(데이터) ---------------- */
const defaultMembers = () => ([
  { id: 'mom', name: '엄마', img: 'assets/mom.png', status: '집에 있어요', color: 'pink' },
  { id: 'dad', name: '아빠', img: 'assets/dad.png', status: '일하는 중!', color: 'blue' },
  { id: 'child1', name: '첫째', img: 'assets/child1.png', status: '학교/학원에 있어요', color: 'yellow' },
  { id: 'child2', name: '둘째', img: 'assets/child2.png', status: '집에 있어요', color: 'peach' }
]);

const defaultRoutines = () => ({
  child1: [
    { id: uid(), text: '일어나서 물 한 잔' },
    { id: uid(), text: '세수하고 아침 준비' },
    { id: uid(), text: '책가방 · 준비물 확인' },
    { id: uid(), text: '숙제 끝내기' },
    { id: uid(), text: '독서 30분' },
    { id: uid(), text: '내일 시간표 확인 · 방 정리' }
  ],
  child2: [
    { id: uid(), text: '일어나서 물 한 잔' },
    { id: uid(), text: '세수하고 아침 준비' },
    { id: uid(), text: '책가방 · 알림장 확인' },
    { id: uid(), text: '숙제 끝내기' },
    { id: uid(), text: '바른 자세로 책 읽기 20분' },
    { id: uid(), text: '장난감 정리 · 내일 준비물' }
  ]
});

const defaultQuests = () => ([
  { id: uid(), child: 'child1', emoji: '📚', title: '책 3권 읽기', goal: 3, progress: 0, reward: '좋아하는 간식', done: false },
  { id: uid(), child: 'child1', emoji: '✏️', title: '받아쓰기 연습 5번', goal: 5, progress: 0, reward: '30분 게임 시간', done: false },
  { id: uid(), child: 'child1', emoji: '🎯', title: '줄넘기 200개', goal: 10, progress: 0, reward: '주말 외식 메뉴 고르기', done: false },
  { id: uid(), child: 'child2', emoji: '📖', title: '그림책 5권 읽기', goal: 5, progress: 0, reward: '스티커 한 장', done: false },
  { id: uid(), child: 'child2', emoji: '✍️', title: '바른 글씨 10줄', goal: 10, progress: 0, reward: '좋아하는 과일', done: false },
  { id: uid(), child: 'child2', emoji: '🎨', title: '그림 3장 그리기', goal: 3, progress: 0, reward: '미술 시간 늘리기', done: false }
]);

function blankState() {
  return {
    version: 1,
    houseName: '보통날의 우리집',
    location: null,
    members: defaultMembers(),
    events: [],
    todos: [],
    shopping: [],
    dinner: { menu: '', updatedAt: null, history: [] },
    letters: [],
    routines: defaultRoutines(),
    routineLog: {},
    stars: { child1: 0, child2: 0 },
    quests: defaultQuests(),
    scheduleOverrides: { child1: {}, child2: {} },
    weatherCache: null,
    adventure: null,
    naverSync: ''
  };
}

/* ---------------- 네이버 공통 일정 ---------------- */
function naverEventObjects() {
  if (!NAVER_CAL) return [];
  return NAVER_CAL.events.map(ev => ({
    id: 'nv-' + ev.id,
    title: ev.title,
    date: ev.date,
    endDate: ev.endDate || '',
    time: ev.time || '',
    endTime: ev.endTime || '',
    location: ev.location || '',
    memo: ev.memo || '',
    source: 'naver'
  }));
}

/* data/calendar.js 의 version 이 바뀌었을 때만 한 번 반영합니다.
   사용자가 직접 넣은 일정은 그대로 두고, 예전 샘플 일정만 걷어냅니다. */
function applyNaverCalendar(s) {
  if (!NAVER_CAL) return s;
  if (s.naverSync === NAVER_CAL.version) return s;
  s.events = (Array.isArray(s.events) ? s.events : []).filter(ev => {
    if (!ev || typeof ev !== 'object') return false;
    if (ev.source === 'naver') return false;
    if (ev.source === 'sample') return false;
    if (!ev.source && SAMPLE_MEMOS[ev.title] && SAMPLE_MEMOS[ev.title] === ev.memo) return false;
    return true;
  });
  const have = {};
  s.events.forEach(ev => { have[ev.id] = true; });
  naverEventObjects().forEach(ev => { if (!have[ev.id]) s.events.push(ev); });
  s.naverSync = NAVER_CAL.version;
  return s;
}

function createFirstState() {
  const s = blankState();
  return applyNaverCalendar(s);
}

function mergeState(saved) {
  const base = blankState();
  const s = Object.assign({}, base, saved || {});
  const savedMembers = (Array.isArray(saved && saved.members) && saved.members.length) ? saved.members : base.members;
  s.members = [0, 1, 2, 3].map(i => {
    const m = savedMembers[i] || {};
    const b = base.members[i];
    return {
      id: m.id || b.id,
      name: (typeof m.name === 'string' && m.name.trim()) ? m.name : b.name,
      img: m.img || b.img,
      status: m.status || b.status,
      color: m.color || b.color
    };
  });
  ['events', 'todos', 'shopping', 'letters', 'quests'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  s.dinner = Object.assign({ menu: '', updatedAt: null, history: [] }, saved && saved.dinner);
  if (!Array.isArray(s.dinner.history)) s.dinner.history = [];
  s.routines = Object.assign({}, base.routines, saved && saved.routines);
  ['child1', 'child2'].forEach(k => { if (!Array.isArray(s.routines[k])) s.routines[k] = base.routines[k]; });
  s.routineLog = (saved && typeof saved.routineLog === 'object' && saved.routineLog) || {};
  s.stars = Object.assign({ child1: 0, child2: 0 }, saved && saved.stars);
  s.scheduleOverrides = (saved && typeof saved.scheduleOverrides === 'object' && saved.scheduleOverrides) || {};
  ['child1', 'child2'].forEach(k => {
    if (!s.scheduleOverrides[k] || typeof s.scheduleOverrides[k] !== 'object') s.scheduleOverrides[k] = {};
  });
  delete s.timetable;
  if (typeof s.houseName !== 'string' || !s.houseName.trim()) s.houseName = base.houseName;
  applyNaverCalendar(s);
  return s;
}

/* ---------------- 저장 · 가족 잠금(PIN) ---------------- */
/* 기본은 잠금 없이 바로 열립니다. 설정에서 PIN 4자리를 정하면 그때부터
   이 기기의 기록이 Web Crypto AES-GCM으로 암호화되어 저장돼요. */
let state = null;
let saveFailWarned = false;

const HAS_WEBCRYPTO = !!(window.crypto && window.crypto.subtle);

const b64 = {
  enc: buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); },
  dec: str => { const s = atob(str); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
};

let pinLock = null;        // { v, enabled, salt, iterations, createdAt }
let stateKey = null;       // 잠금 해제 동안만 메모리에 두는 AES 키
let encSaveTimer = null;
let saveChain = Promise.resolve();

async function deriveKey(pin, saltB64, iterations) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64.dec(saltB64), iterations: iterations || PIN_ITERATIONS, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { v: 2, enc: 'AES-GCM', iv: b64.enc(iv), data: b64.enc(ct), savedAt: Date.now() };
}

async function decryptJSON(key, env) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(env.iv) }, key, b64.dec(env.data));
  return JSON.parse(new TextDecoder().decode(pt));
}

function readJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

function queueEncryptedSave() {
  const snapshot = state;
  saveChain = saveChain.then(async () => {
    if (!stateKey) return; // 그사이 잠금을 해제했으면 암호문을 다시 썼지 않아요
    try {
      const env = await encryptJSON(stateKey, snapshot);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
    } catch (e) {
      if (!saveFailWarned) { saveFailWarned = true; toast('암호화 저장에 문제가 생겼어요'); }
    }
  });
  return saveChain;
}

function save() {
  try {
    if (stateKey) {
      clearTimeout(encSaveTimer);
      encSaveTimer = setTimeout(queueEncryptedSave, 150);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    if (!saveFailWarned) { saveFailWarned = true; toast('저장 공간이 부족해 기록을 저장하지 못했어요'); }
  }
}

/* 화면 상태 */
let selectedDate = todayISO();
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let todoList = 'todo';
let routineDate = todayISO();

/* ---------------- 공통 UI ---------------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

const modalRoot = $('#modalRoot');
const modalTitle = $('#modalTitle');
const modalBody = $('#modalBody');

function openModal(title, html, onMount) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modalRoot.hidden = false;
  document.body.style.overflow = 'hidden';
  if (typeof onMount === 'function') onMount(modalBody);
  const first = modalBody.querySelector('input,textarea,select,button');
  if (first) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) { } }, 60);
}
function closeModal() {
  modalRoot.hidden = true;
  modalBody.innerHTML = '';
  document.body.style.overflow = '';
}
function confirmModal(title, message, okText, onOk, danger) {
  openModal(title, `
    <p class="hint" style="margin:0">${esc(message)}</p>
    <div class="modal-actions">
      <span class="spacer"></span>
      <button type="button" class="soft-btn" data-act="cancel">취소</button>
      <button type="button" class="${danger ? 'danger-btn' : 'primary-btn'}" data-act="ok">${esc(okText || '확인')}</button>
    </div>`, body => {
    body.querySelector('[data-act=cancel]').onclick = closeModal;
    body.querySelector('[data-act=ok]').onclick = () => { closeModal(); onOk(); };
  });
}

function memberById(id) { return state.members.find(m => m.id === id); }
function memberName(id) { const m = memberById(id); return m ? m.name : '가족'; }
function isChild(id) { return id === 'child1' || id === 'child2'; }

/* ---------------- 헤더 · 탭 ---------------- */
function renderHeader() {
  $('#houseName').textContent = state.houseName;
  const n = new Date();
  const wd = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][n.getDay()];
  $('#todayLabel').textContent = `${n.getFullYear()}년 ${n.getMonth() + 1}월 ${n.getDate()}일 ${wd}`;
}
function tickClock() {
  const n = new Date();
  const ap = n.getHours() < 12 ? '오전' : '오후';
  const h = n.getHours() % 12 === 0 ? 12 : n.getHours() % 12;
  $('#clock').textContent = `${ap} ${h}:${pad(n.getMinutes())}`;
}

function switchTab(name) {
  $$('.tab').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $$('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + name));
  if (name === 'routine') { renderRoutine(); renderWeekBoard(); renderTimetable(); }
  if (name === 'quest') renderQuests();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- 달력 ---------------- */
function evColor(ev) {
  if (ev && ev.source === 'naver') return NAVER_COLOR;
  return EVENT_COLORS[((ev && ev.color) || 0) % EVENT_COLORS.length];
}

function eventsOn(dateStr) {
  return state.events.filter(ev => {
    const start = ev.date;
    const end = ev.endDate && ev.endDate >= ev.date ? ev.endDate : ev.date;
    return dateStr >= start && dateStr <= end;
  });
}

function renderCalendar() {
  $('#calMonth').textContent = `${viewYear}년 ${viewMonth + 1}월`;

  const weekdays = $('#calWeekdays');
  if (!weekdays.childElementCount) {
    weekdays.innerHTML = DOW.map(d => `<span>${d}</span>`).join('');
  }

  const first = new Date(viewYear, viewMonth, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const todayStr = todayISO();

  let html = '';
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const d = inMonth ? new Date(viewYear, viewMonth, dayNum) : new Date(viewYear, viewMonth, dayNum);
    const ds = isoDate(d);
    const dow = d.getDay();
    const evs = eventsOn(ds);
    const cls = ['cal-day'];
    if (!inMonth) cls.push('is-other');
    if (dow === 0) cls.push('sun');
    if (dow === 6) cls.push('sat');
    if (ds === todayStr && inMonth) cls.push('is-today');
    if (ds === selectedDate) cls.push('is-selected');
    const dots = evs.slice(0, 3).map(ev => `<i style="background:${evColor(ev)}"></i>`).join('');
    html += `<button type="button" class="${cls.join(' ')}" data-date="${ds}" aria-label="${d.getMonth() + 1}월 ${d.getDate()}일${evs.length ? ', 일정 ' + evs.length + '개' : ''}">
      <span class="dnum">${d.getDate()}</span>
      <span class="dots">${dots}</span>
    </button>`;
  }
  $('#calGrid').innerHTML = html;

  const note = $('#calSyncNote');
  if (note) {
    note.textContent = NAVER_CAL
      ? `🟢 네이버「${NAVER_CAL.calendar.replace(/^\[공유\]\s*/, '')}」 일정 ${NAVER_CAL.events.length}개 · ${NAVER_CAL.syncedAt} 동기화`
      : '';
  }

  renderDayPanel();
}

function renderDayPanel() {
  const isToday = selectedDate === todayISO();
  $('#selectedDateLabel').innerHTML = `${mdLabel(selectedDate)}${isToday ? ' <span class="dp-today">오늘</span>' : ''}`;

  const evs = eventsOn(selectedDate).slice().sort((a, b) => {
    const ka = (a.time ? '1' + a.time : '0');
    const kb = (b.time ? '1' + b.time : '0');
    return ka.localeCompare(kb);
  });
  const list = $('#dayEvents');

  if (!evs.length) {
    list.innerHTML = `<li class="empty-note">일정이 없어요 🌿<br>여유로운 하루를 보내 보세요</li>`;
    return;
  }
  list.innerHTML = evs.map(ev => {
    const range = ev.endDate && ev.endDate > ev.date ? `${shortDate(ev.date)} ~ ${shortDate(ev.endDate)}` : '';
    const timeText = ev.time ? (ev.endTime && ev.endTime !== ev.time ? `${ev.time}–${ev.endTime}` : ev.time) : '';
    const meta = [timeText, range].filter(Boolean).join(' · ');
    const naver = ev.source === 'naver';
    return `<li class="ev ${naver ? 'is-naver' : ''}" data-id="${ev.id}" style="--ev-color:${evColor(ev)}">
      <div class="ev-title">${esc(ev.title)}${naver ? '<span class="ev-src">네이버</span>' : ''}</div>
      ${meta ? `<div class="ev-meta">${esc(meta)}</div>` : ''}
      ${ev.location ? `<div class="ev-meta">📍 ${esc(ev.location)}</div>` : ''}
      ${ev.memo ? `<div class="ev-memo">${esc(ev.memo)}</div>` : ''}
      ${naver ? '' : `<button type="button" class="ev-del" data-del="${ev.id}" aria-label="일정 삭제">✕</button>`}
    </li>`;
  }).join('');
}

/* 네이버에서 가져온 일정은 여기서 고치지 않고 내용만 보여 줍니다 */
function openNaverEventModal(ev) {
  const range = ev.endDate && ev.endDate > ev.date ? `${mdLabel(ev.date)} ~ ${mdLabel(ev.endDate)}` : mdLabel(ev.date);
  const timeText = ev.time ? (ev.endTime && ev.endTime !== ev.time ? `${ev.time} ~ ${ev.endTime}` : ev.time) : '종일';
  openModal('네이버 공통 일정', `
    <div class="naver-detail">
      <div class="nd-title">${esc(ev.title)}<span class="ev-src">네이버</span></div>
      <div class="nd-row"><b>날짜</b><span>${esc(range)}</span></div>
      <div class="nd-row"><b>시간</b><span>${esc(timeText)}</span></div>
      ${ev.location ? `<div class="nd-row"><b>장소</b><span>${esc(ev.location)}</span></div>` : ''}
      ${ev.memo ? `<div class="nd-row"><b>메모</b><span>${esc(ev.memo)}</span></div>` : ''}
      <p class="hint" style="margin:10px 0 0">네이버 캘린더 「${esc(NAVER_CAL ? NAVER_CAL.calendar.replace(/^\[공유\]\s*/, '') : '공유')}」에서 가져온 일정이에요.<br>고치거나 지우려면 네이버 캘린더에서 바꿔 주세요.</p>
    </div>
    <div class="modal-actions">
      <span class="spacer"></span>
      <button type="button" class="soft-btn" data-act="cancel">닫기</button>
    </div>`, body => {
    body.querySelector('[data-act=cancel]').onclick = closeModal;
  });
}

function openEventModal(ev, presetDate) {
  if (ev && ev.source === 'naver') { openNaverEventModal(ev); return; }
  const edit = !!ev;
  const d = ev ? ev.date : (presetDate || selectedDate);
  openModal(edit ? '일정 고치기' : '새 일정', `
    <form class="form">
      <label class="field"><span>제목</span>
        <input name="title" maxlength="40" placeholder="예: 가족 영화 보기" value="${esc(edit ? ev.title : '')}" required>
      </label>
      <div class="row-2">
        <label class="field"><span>날짜</span><input type="date" name="date" value="${esc(d)}" required></label>
        <label class="field"><span>시간 (선택)</span><input type="time" name="time" value="${esc(edit ? ev.time || '' : '')}"></label>
      </div>
      <label class="check-row"><input type="checkbox" name="multi" ${edit && ev.endDate ? 'checked' : ''}> 여러 날 일정</label>
      <label class="field" id="endField" ${edit && ev.endDate ? '' : 'hidden'}><span>마지막 날</span>
        <input type="date" name="endDate" value="${esc(edit && ev.endDate ? ev.endDate : '')}">
      </label>
      <label class="field"><span>메모 (선택)</span>
        <textarea name="memo" rows="2" maxlength="120" placeholder="챙길 것, 장소 등을 적어 두세요">${esc(edit ? ev.memo || '' : '')}</textarea>
      </label>
      <div class="modal-actions">
        ${edit ? '<button type="button" class="danger-btn" data-act="delete">삭제</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">취소</button>
        <button type="submit" class="primary-btn">저장</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('form');
    const multi = form.elements.multi;
    const endField = form.querySelector('#endField');
    multi.addEventListener('change', () => {
      endField.hidden = !multi.checked;
      if (multi.checked && !form.elements.endDate.value) form.elements.endDate.value = form.elements.date.value;
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const title = form.elements.title.value.trim();
      if (!title) { form.elements.title.focus(); return; }
      let start = form.elements.date.value || todayISO();
      let end = multi.checked ? (form.elements.endDate.value || start) : '';
      if (end && end < start) { const t = start; start = end; end = t; }
      const color = edit ? (ev.color || 0) : (state.events.length % EVENT_COLORS.length);
      const payload = { title, date: start, endDate: end, time: form.elements.time.value, memo: form.elements.memo.value.trim(), color };
      if (edit) Object.assign(ev, payload);
      else state.events.push(Object.assign({ id: uid() }, payload));
      save();
      selectedDate = start;
      const sd = parseISO(start);
      viewYear = sd.getFullYear();
      viewMonth = sd.getMonth();
      closeModal();
      renderCalendar();
      toast(edit ? '일정을 고쳤어요' : '일정을 담았어요 ✏️');
    });
    const delBtn = form.querySelector('[data-act=delete]');
    if (delBtn) delBtn.onclick = () => {
      closeModal();
      confirmModal('일정을 지울까요?', `"${ev.title}" 일정이 사라져요.`, '지우기', () => {
        state.events = state.events.filter(x => x.id !== ev.id);
        save(); renderCalendar(); toast('일정을 지웠어요');
      }, true);
    };
    form.querySelector('[data-act=cancel]').onclick = closeModal;
  });
}

/* ---------------- 날씨 ---------------- */
function currentLocation() { return state.location || DEFAULT_LOCATION; }

function dustGradeFrom(pm10, pm25) {
  const order = ['좋음', '보통', '나쁨', '매우나쁨'];
  const g10 = pm10 == null ? '보통' : pm10 <= 30 ? '좋음' : pm10 <= 80 ? '보통' : pm10 <= 150 ? '나쁨' : '매우나쁨';
  const g25 = pm25 == null ? '보통' : pm25 <= 15 ? '좋음' : pm25 <= 35 ? '보통' : pm25 <= 75 ? '나쁨' : '매우나쁨';
  return order[Math.max(order.indexOf(g10), order.indexOf(g25))];
}

function outfitTip(tmax, tmin, rainChance, dust) {
  let tip;
  if (tmax >= 28) tip = '반팔·반바지에 모자까지. 한낮 햇볕은 그늘로 피해 주세요.';
  else if (tmax >= 23) tip = '얇은 긴팔이나 반팔 + 가벼운 겉옷이 딱 좋아요.';
  else if (tmax >= 20) tip = '긴팔 티셔츠에 얇은 가디건 한 장이면 충분해요.';
  else if (tmax >= 17) tip = '맨투맨이나 니트 한 장. 아침저녁은 살짝 쌀쌀해요.';
  else if (tmax >= 12) tip = '가벼운 자켓이나 코트를 걸치세요.';
  else if (tmax >= 9) tip = '도톰한 코트에 목도리까지 챙기면 좋아요.';
  else if (tmax >= 5) tip = '패딩이나 두꺼운 코트, 따뜻한 양말을 챙기세요.';
  else if (tmax >= 0) tip = '두꺼운 패딩 + 목도리·장갑. 손발이 시릴 수 있어요.';
  else tip = '한파 대비 단단히! 패딩·장갑에 핫팩 하나 더 챙기세요.';
  if (rainChance >= 60) tip += ' 우산 꼭 챙기세요 ☔';
  else if (rainChance >= 30) tip += ' 작은 우산이 있으면 든든해요.';
  if (dust === '나쁨' || dust === '매우나쁨') tip += ' 미세먼지가 나쁘니 마스크를 챙기세요 😷';
  return tip;
}

async function fetchJSON(url, ms = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}

function normalizeWeather(fc, aq, loc) {
  const cur = fc.current || {};
  const daily = fc.daily || {};
  const hourly = fc.hourly || {};
  const times = hourly.time || [];
  const now = new Date();
  const nowKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
  let idx = times.indexOf(nowKey);
  if (idx < 0) idx = times.findIndex(t => new Date(t) >= now);
  if (idx < 0) idx = 0;

  const hours = [0, 3, 6, 9, 12].map((off, i) => {
    const j = clamp(idx + off, 0, Math.max(0, times.length - 1));
    const hh = times[j] ? Number(times[j].slice(11, 13)) : now.getHours();
    const t = hourly.temperature_2m ? hourly.temperature_2m[j] : null;
    const c = hourly.weather_code ? hourly.weather_code[j] : (cur.weather_code || 0);
    return {
      label: i === 0 ? '지금' : hourLabel(hh),
      temp: t == null ? null : Math.round(t),
      code: c == null ? 0 : c,
      now: i === 0
    };
  });

  let rainChance = 0;
  const precip = (hourly.precipitation_probability || []).slice(idx, idx + 13).map(v => v || 0);
  if (precip.length) rainChance = Math.max.apply(null, precip);

  const pm10 = aq && aq.current ? aq.current.pm10 : null;
  const pm25 = aq && aq.current ? aq.current.pm2_5 : null;
  const dust = dustGradeFrom(pm10, pm25);
  const tmax = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : null;
  const tmin = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : null;

  return {
    at: Date.now(),
    lat: loc.lat,
    lng: loc.lng,
    locLabel: loc.label,
    code: cur.weather_code != null ? cur.weather_code : 0,
    temp: cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null,
    feels: cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null,
    hum: cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) : null,
    wind: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) : null,
    tmax, tmin,
    hours,
    dust, pm10: pm10 == null ? null : Math.round(pm10), pm25: pm25 == null ? null : Math.round(pm25),
    rainChance,
    tip: outfitTip(tmax == null ? 15 : tmax, tmin == null ? 5 : tmin, rainChance, dust)
  };
}

function renderWeather(w, stale) {
  if (!w) return;
  const [label, emoji] = WMO[w.code] || ['맑음', '☀️'];
  $('#wIcon').textContent = emoji;
  $('#wTemp').textContent = (w.temp == null ? '--' : w.temp) + '°';
  $('#wDesc').textContent = `${w.locLabel} · ${label}`;
  $('#wRange').textContent = (w.tmax == null || w.tmin == null) ? '' : `최고 ${w.tmax}° / 최저 ${w.tmin}°`;
  $('#wFeels').textContent = (w.feels == null ? '--' : w.feels) + '°';
  $('#wHum').textContent = (w.hum == null ? '--' : w.hum) + '%';

  const dustEl = $('#wDust');
  const dust = w.dust || '—';
  dustEl.textContent = `${dust}${w.pm10 == null ? '' : ' · ' + w.pm10}`;
  dustEl.parentElement.classList.toggle('warm', dust === '나쁨' || dust === '매우나쁨');

  $('#wHours').innerHTML = (w.hours || []).map(h => {
    const [, e] = WMO[h.code] || ['', '·'];
    return `<div class="wt-hour ${h.now ? 'is-now' : ''}">
      <span class="hh">${esc(h.label)}</span>
      <span class="hi">${e}</span>
      <span class="ht">${h.temp == null ? '--' : h.temp}°</span>
    </div>`;
  }).join('');

  $('#wTip').textContent = '🧥 ' + w.tip;
  const at = new Date(w.at);
  const stamp = `${at.getHours() < 12 ? '오전' : '오후'} ${at.getHours() % 12 === 0 ? 12 : at.getHours() % 12}:${pad(at.getMinutes())}`;
  $('#weatherNote').textContent = stale
    ? `${stamp}에 마지막으로 확인한 날씨예요 · 다시 불러오는 중`
    : `${stamp} 기준 · Open-Meteo`;
  $('#locLabel').textContent = w.locLabel;
}

function renderWeatherEmpty(msg) {
  $('#wIcon').textContent = '🌫';
  $('#wTemp').textContent = '--°';
  $('#wDesc').textContent = msg || '날씨를 불러오지 못했어요';
  $('#wRange').textContent = '';
  $('#wFeels').textContent = '--°';
  $('#wHum').textContent = '--%';
  $('#wDust').textContent = '--';
  $('#wHours').innerHTML = '';
  $('#wTip').textContent = '🧥 날씨를 불러오면 오늘 옷차림 팁을 알려 드려요.';
  $('#weatherNote').textContent = '새로고침 버튼(⌁)을 눌러 다시 시도해 보세요';
}

let weatherLoading = false;
const samePlace = (w, loc) => !!w && Number(w.lat) === Number(loc.lat) && Number(w.lng) === Number(loc.lng);

async function loadWeather() {
  if (weatherLoading) return;
  weatherLoading = true;
  const loc = currentLocation();
  $('#locLabel').textContent = loc.label;

  if (samePlace(state.weatherCache, loc)) renderWeather(state.weatherCache, false);

  const base = `latitude=${loc.lat}&longitude=${loc.lng}&timezone=Asia%2FSeoul`;
  const fcUrl = `https://api.open-meteo.com/v1/forecast?${base}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=2&wind_speed_unit=ms`;
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${base}&current=pm10,pm2_5,us_aqi`;

  try {
    const fc = await fetchJSON(fcUrl);
    let aq = null;
    try { aq = await fetchJSON(aqUrl, 7000); } catch (e) { aq = null; }
    const w = normalizeWeather(fc, aq, loc);
    state.weatherCache = w;
    save();
    renderWeather(w, false);
  } catch (e) {
    console.warn('[weather] 불러오기 실패:', e && e.message ? e.message : e);
    if (samePlace(state.weatherCache, loc)) renderWeather(state.weatherCache, true);
    else if (state.weatherCache) { renderWeather(state.weatherCache, true); $('#weatherNote').textContent = '새 날씨를 불러오지 못해 이전 기록을 보여드려요'; }
    else renderWeatherEmpty('날씨를 불러오지 못했어요 (오프라인일 수 있어요)');
  } finally {
    weatherLoading = false;
  }
}

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=ko&format=json`;
  const data = await fetchJSON(url, 8000);
  return data.results || [];
}

function openLocationModal() {
  const loc = currentLocation();
  openModal('날씨 위치', `
    <div class="field"><span>지금 위치</span>
      <div class="chip-pick"><button type="button" class="is-on">📍 ${esc(loc.label)}</button></div>
    </div>
    <div class="settings-block">
      <div class="settings-title">동네 이름으로 찾기</div>
      <div class="search-row">
        <input type="text" id="geoInput" placeholder="예: 서울, 성수동, 해운대" maxlength="30">
        <button type="button" class="soft-btn" id="geoSearch">찾기</button>
      </div>
      <div class="pick-list" id="geoResults" hidden></div>
    </div>
    <div class="settings-block">
      <div class="settings-title">또는</div>
      <button type="button" class="soft-btn" id="geoNow">현재 위치 사용</button>
      <p class="hint" style="margin:6px 0 0">브라우저가 위치를 물어보면 허용해 주세요. 위치는 이 기기에만 저장돼요.</p>
    </div>`, body => {
    const input = body.querySelector('#geoInput');
    const results = body.querySelector('#geoResults');
    const search = body.querySelector('#geoSearch');

    const applyLocation = (lat, lng, label) => {
      state.location = { lat: Number(lat), lng: Number(lng), label };
      save(); closeModal(); toast(`위치를 ${label}(으)로 바꿨어요`);
      loadWeather();
    };

    const doSearch = async () => {
      const q = input.value.trim();
      if (!q) { input.focus(); return; }
      search.textContent = '찾는 중…';
      try {
        const found = await geocode(q);
        if (!found.length) { results.hidden = false; results.innerHTML = `<button type="button" disabled>찾지 못했어요. 다른 이름으로 해 보세요</button>`; }
        else {
          results.hidden = false;
          results.innerHTML = found.map((r, i) => `
            <button type="button" data-i="${i}">
              <span>${esc(r.name)}</span>
              <small>${esc([r.admin1, r.country].filter(Boolean).join(' · '))}</small>
            </button>`).join('');
          results.querySelectorAll('button[data-i]').forEach(btn => {
            btn.onclick = () => {
              const r = found[Number(btn.dataset.i)];
              applyLocation(r.latitude, r.longitude, r.name);
            };
          });
        }
      } catch (e) {
        results.hidden = false;
        results.innerHTML = `<button type="button" disabled>검색이 안 돼요. 인터넷 연결을 확인해 주세요</button>`;
      } finally { search.textContent = '찾기'; }
    };
    search.onclick = doSearch;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });

    body.querySelector('#geoNow').onclick = () => {
      if (!navigator.geolocation) { toast('이 브라우저는 위치를 지원하지 않아요'); return; }
      toast('현재 위치를 확인하는 중…');
      navigator.geolocation.getCurrentPosition(
        p => applyLocation(p.coords.latitude, p.coords.longitude, '현재 위치'),
        () => toast('위치를 가져오지 못했어요. 동네 이름으로 찾아 주세요'),
        { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 }
      );
    };
  });
}

/* ---------------- 할 일 · 장보기 ---------------- */
function listOf(kind) { return kind === 'shopping' ? state.shopping : state.todos; }

function renderTodos() {
  const todos = state.todos, shop = state.shopping;
  $('#todoCount').textContent = todos.filter(t => !t.done).length;
  $('#shopCount').textContent = shop.filter(t => !t.done).length;

  $$('#todoTabs .seg-btn').forEach(b => {
    const on = b.dataset.list === todoList;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });

  $('#todoInput').placeholder = todoList === 'shopping' ? '살 것 추가 (예: 우유)' : '할 일 추가';

  const items = listOf(todoList).slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    return (a.created || 0) - (b.created || 0);
  });

  const list = $('#todoList');
  if (!items.length) {
    list.innerHTML = `<li class="empty-note">${todoList === 'shopping' ? '장바구니가 비어 있어요 🛒' : '오늘 할 일을 적어 보세요 ✏️'}</li>`;
    return;
  }

  const today = todayISO();
  list.innerHTML = items.map(t => {
    const meta = [];
    if (t.due) {
      const overdue = !t.done && t.due < today;
      meta.push(`<span class="${overdue ? 'over' : ''}">~${shortDate(t.due)}${overdue ? ' 지남' : ''}</span>`);
    }
    if (t.who && memberById(t.who)) meta.push(`<span class="who">${esc(memberName(t.who))}</span>`);
    return `<li class="check-item ${t.done ? 'is-done' : ''}" data-id="${t.id}">
      <button type="button" class="check" data-act="toggle" aria-pressed="${t.done ? 'true' : 'false'}" aria-label="완료">✓</button>
      <div class="ci-main">
        <div class="ci-text">${esc(t.text)}</div>
        ${meta.length ? `<div class="ci-meta">${meta.join('')}</div>` : ''}
      </div>
      <button type="button" class="ci-del" data-act="del" aria-label="삭제">✕</button>
    </li>`;
  }).join('');
}

function renderAssigneeOptions() {
  const sel = $('#todoAssignee');
  const prev = sel.value;
  sel.innerHTML = `<option value="">누가</option>` + state.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
  if (prev) sel.value = prev;
}

/* ---------------- 저녁 메뉴 ---------------- */
function renderDinner() {
  const d = state.dinner;
  const menuEl = $('#dinnerMenu');
  if (d.menu) {
    menuEl.textContent = d.menu;
    menuEl.classList.remove('is-empty');
    $('#dinnerMeta').textContent = d.updatedAt ? `${relTime(d.updatedAt)}에 정했어요` : '오늘의 저녁';
  } else {
    menuEl.textContent = '아직 정하지 않았어요 🍳';
    menuEl.classList.add('is-empty');
    $('#dinnerMeta').textContent = '무엇을 해 먹을까요?';
  }

  const recent = $('#dinnerRecent');
  const hist = (d.history || []).slice(0, 5);
  recent.innerHTML = hist.length
    ? hist.map(h => `<li><span>${esc(h.menu)}</span><span>${esc(h.date || relTime(h.at))}</span></li>`).join('')
    : `<li class="none">아직 기록이 없어요</li>`;
}

function setDinner(menu) {
  const d = state.dinner;
  if (d.menu && d.menu !== menu) {
    d.history.unshift({ menu: d.menu, at: Date.now(), date: `${parseISO(todayISO()).getMonth() + 1}/${parseISO(todayISO()).getDate()}` });
    d.history = d.history.slice(0, 12);
  }
  d.menu = menu;
  d.updatedAt = Date.now();
  save(); renderDinner();
}

function openDinnerModal() {
  const picks = DINNER_POOL.slice().sort(() => Math.random() - 0.5).slice(0, 6);
  openModal('저녁 메뉴 바꾸기', `
    <form class="form">
      <label class="field"><span>메뉴</span>
        <input name="menu" maxlength="30" placeholder="예: 김치찌개" value="${esc(state.dinner.menu || '')}">
      </label>
      <div class="menu-suggest" id="menuSuggest">
        ${picks.map(p => `<button type="button">${esc(p)}</button>`).join('')}
      </div>
      <div class="btn-row">
        <button type="button" class="soft-btn" id="btnRandom">🎲 추천 메뉴 돌리기</button>
      </div>
      <div class="modal-actions">
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">취소</button>
        <button type="submit" class="primary-btn">저장</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('form');
    const input = form.elements.menu;
    body.querySelectorAll('#menuSuggest button').forEach(b => {
      b.onclick = () => { input.value = b.textContent; };
    });
    body.querySelector('#btnRandom').onclick = () => {
      let pick = DINNER_POOL[Math.floor(Math.random() * DINNER_POOL.length)];
      if (pick === input.value) pick = DINNER_POOL[(DINNER_POOL.indexOf(pick) + 3) % DINNER_POOL.length];
      input.value = pick;
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      setDinner(v); closeModal(); toast('저녁 메뉴를 정했어요 🍲');
    });
    form.querySelector('[data-act=cancel]').onclick = closeModal;
  });
}

/* ---------------- 가족 상태 ---------------- */
function renderStatus() {
  $('#statusGrid').innerHTML = state.members.map(m => `
    <button type="button" class="member" data-id="${m.id}" data-color="${m.color}" aria-label="${esc(m.name)} 상태 바꾸기">
      <span class="member-photo">
        <img src="${m.img}" alt="${esc(m.name)}" loading="lazy">
        <span class="member-name">${esc(m.name)}</span>
      </span>
      <span class="member-status">${esc(m.status)}</span>
    </button>`).join('');
}

function openMemberModal(member) {
  openModal(`${member.name} 상태 바꾸기`, `
    <form class="form">
      <label class="field"><span>이름</span>
        <input name="name" maxlength="10" value="${esc(member.name)}" placeholder="엄마, 첫째처럼 불러 주세요">
      </label>
      <div class="field"><span>지금 상태</span>
        <div class="chip-pick" id="statusChips">
          ${STATUS_PRESETS.map(s => `<button type="button" data-s="${esc(s)}" class="${s === member.status ? 'is-on' : ''}">${esc(s)}</button>`).join('')}
        </div>
      </div>
      <label class="field"><span>직접 입력</span>
        <input name="custom" maxlength="20" placeholder="예: 할머니 댁에 있어요" value="${STATUS_PRESETS.includes(member.status) ? '' : esc(member.status)}">
      </label>
      <div class="modal-actions">
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">취소</button>
        <button type="submit" class="primary-btn">저장</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('form');
    const chips = body.querySelectorAll('#statusChips button');
    let picked = member.status;
    chips.forEach(c => {
      c.onclick = () => {
        picked = c.dataset.s;
        chips.forEach(x => x.classList.toggle('is-on', x === c));
        form.elements.custom.value = '';
      };
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.elements.name.value.trim() || member.name;
      const custom = form.elements.custom.value.trim();
      member.name = name;
      member.status = custom || picked || '집에 있어요';
      save(); closeModal(); renderStatus(); renderTodos(); renderRoutine(); renderLetters(); toast('상태를 바꿨어요');
    });
    form.querySelector('[data-act=cancel]').onclick = closeModal;
  });
}

function openMembersModal() {
  openModal('가족 이름 바꾸기', `
    <form class="form">
      <p class="hint" style="margin:0">이름은 이 기기에만 저장돼요. 부르고 싶은 대로 바꿔 주세요.</p>
      ${state.members.map((m, i) => `
        <label class="field"><span>${esc(m.img.includes('mom') ? '첫 번째' : m.img.includes('dad') ? '두 번째' : m.img.includes('child1') ? '세 번째' : '네 번째')} 가족</span>
          <input name="name${i}" maxlength="10" value="${esc(m.name)}">
        </label>`).join('')}
      <div class="modal-actions">
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">취소</button>
        <button type="submit" class="primary-btn">저장</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      state.members.forEach((m, i) => {
        const v = form.elements['name' + i].value.trim();
        if (v) m.name = v;
      });
      save(); closeModal(); renderStatus(); renderTodos(); renderRoutine(); renderQuests(); renderTimetable(); renderLetters();
      toast('이름을 바꿨어요');
    });
    form.querySelector('[data-act=cancel]').onclick = closeModal;
  });
}

/* ---------------- 우체통 ---------------- */
function renderLetters() {
  const letters = state.letters.slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  const unread = letters.filter(l => !l.read).length;
  const badge = $('#letterBadge');
  badge.textContent = `새 편지 ${unread}`;
  badge.style.display = letters.length ? '' : 'none';

  const list = $('#letterList');
  if (!letters.length) {
    list.innerHTML = `<li class="empty-note">아직 편지가 없어요 💌<br>첫 편지를 남겨 보세요</li>`;
    return;
  }
  list.innerHTML = letters.map(l => {
    const from = l.fromId ? memberName(l.fromId) : (l.fromText || '가족');
    return `<li class="letter ${l.read ? '' : 'is-new'}" data-id="${l.id}">
      <div class="letter-head">
        ${l.read ? '' : '<span class="new-dot"></span>'}
        <span class="from">${esc(from)}</span>
        <span>→ ${esc(relTime(l.at))}</span>
      </div>
      <div class="letter-text">${esc(l.text)}</div>
      <div class="letter-foot">
        <button type="button" class="read-toggle" data-act="read">${l.read ? '읽었어요 ✓' : '읽었어요'}</button>
        <button type="button" class="letter-del" data-act="del" aria-label="편지 삭제">✕</button>
      </div>
    </li>`;
  }).join('');
}

function openLetterModal() {
  openModal('편지 쓰기', `
    <form class="form">
      <label class="field"><span>보내는 사람</span>
        <select name="from">
          ${state.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}
          <option value="__custom">직접 입력</option>
        </select>
      </label>
      <label class="field" id="customFrom" hidden><span>이름</span>
        <input name="fromText" maxlength="12" placeholder="예: 할머니">
      </label>
      <label class="field"><span>내용</span>
        <textarea name="text" rows="4" maxlength="300" placeholder="오늘 고마웠던 일, 하고 싶은 말을 남겨 보세요" required></textarea>
      </label>
      <div class="modal-actions">
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">취소</button>
        <button type="submit" class="primary-btn">보내기</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('form');
    const sel = form.elements.from;
    const custom = body.querySelector('#customFrom');
    sel.onchange = () => {
      custom.hidden = sel.value !== '__custom';
      if (!custom.hidden) form.elements.fromText.focus();
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = form.elements.text.value.trim();
      if (!text) { form.elements.text.focus(); return; }
      const isCustom = sel.value === '__custom';
      const fromText = form.elements.fromText.value.trim();
      if (isCustom && !fromText) { form.elements.fromText.focus(); return; }
      state.letters.push({
        id: uid(),
        fromId: isCustom ? '' : sel.value,
        fromText: isCustom ? fromText : '',
        text, at: Date.now(), read: false
      });
      save(); closeModal(); renderLetters(); toast('편지를 넣었어요 💌');
    });
    form.querySelector('[data-act=cancel]').onclick = closeModal;
  });
}

/* ---------------- 하루 루틴 ---------------- */
function logFor(date, childId) {
  if (!state.routineLog[date]) state.routineLog[date] = {};
  if (!state.routineLog[date][childId]) state.routineLog[date][childId] = { done: [], sticker: false };
  const l = state.routineLog[date][childId];
  if (!Array.isArray(l.done)) l.done = [];
  return l;
}

function peekLog(date, childId) {
  const log = state.routineLog[date] && state.routineLog[date][childId];
  if (!log) return { done: [], sticker: false };
  return { done: Array.isArray(log.done) ? log.done : [], sticker: !!log.sticker };
}

function renderRoutine() {
  // 주간 전환
  const base = parseISO(routineDate);
  const weekStart = addDays(base, -base.getDay());
  const sw = $('#weekSwitch');
  sw.innerHTML = DOW.map((d, i) => {
    const dt = addDays(weekStart, i);
    const ds = isoDate(dt);
    return `<button type="button" data-date="${ds}" class="${ds === routineDate ? 'is-active' : ''}">${d} ${dt.getDate()}</button>`;
  }).join('');

  const isToday = routineDate === todayISO();
  const children = state.members.filter(m => isChild(m.id));

  $('#routineGrid').innerHTML = children.map(m => {
    const items = state.routines[m.id] || [];
    const log = peekLog(routineDate, m.id);
    const doneCount = items.filter(it => log.done.includes(it.id)).length;
    const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
    const stars = state.stars[m.id] || 0;

    return `<div class="child-col">
      <div class="child-head">
        <img class="child-avatar" src="${m.img}" alt="${esc(m.name)}">
        <div class="child-info">
          <div class="child-name">${esc(m.name)}</div>
          <div class="child-progress">
            <div class="progress"><i style="width:${pct}%"></i></div>
            <span class="progress-num">${doneCount}/${items.length}</span>
          </div>
        </div>
        <span class="sticker-count" title="모은 스티커">⭐ ${stars}</span>
      </div>
      <div class="routine-items">
        ${items.map(it => `<div class="routine-item ${log.done.includes(it.id) ? 'is-done' : ''}" data-child="${m.id}" data-item="${it.id}">
          <button type="button" class="check" data-act="toggle" aria-pressed="${log.done.includes(it.id)}" aria-label="체크">✓</button>
          <span class="ci-text">${esc(it.text)}</span>
          <button type="button" class="ci-del" data-act="del" aria-label="삭제">✕</button>
        </div>`).join('')}
      </div>
      ${items.length && doneCount === items.length ? `<div class="done-note">🌼 오늘 루틴 완성! 스티커를 받았어요</div>` : ''}
      <form class="routine-add" data-child="${m.id}">
        <input type="text" maxlength="30" placeholder="루틴 추가" aria-label="루틴 추가">
        <button type="submit" aria-label="추가">＋</button>
      </form>
    </div>`;
  }).join('');

  if (!children.length) {
    $('#routineGrid').innerHTML = `<p class="empty-note">아이 이름을 먼저 정해 주세요</p>`;
  }

  // 카드 상단 날짜
  $('#routineDate').textContent = `${mdLabel(routineDate)}${isToday ? ' · 오늘' : ''}`;
}

function renderWeekBoard() {
  const base = parseISO(routineDate);
  const weekStart = addDays(base, -base.getDay());
  const children = state.members.filter(m => isChild(m.id));
  let total = 0;

  const cells = DOW.map((d, i) => {
    const dt = addDays(weekStart, i);
    const ds = isoDate(dt);
    const log = state.routineLog[ds] || {};
    const marks = children.map(m => {
      const got = log[m.id] && log[m.id].sticker;
      if (got) total++;
      return `<span title="${esc(m.name)}">${got ? '⭐' : '<span class="none">·</span>'}</span>`;
    }).join('');
    const cls = ['day-cell'];
    if (ds === todayISO()) cls.push('is-today');
    return `<div class="${cls.join(' ')}">
      <div class="dw ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>
      <div class="st">${marks}</div>
    </div>`;
  }).join('');

  $('#weekBoard').innerHTML = cells;
  $('#weekNote').textContent = total ? `이번 주 스티커 ${total}개` : '이번 주는 아직이에요';
}

function toggleRoutine(childId, itemId) {
  const log = logFor(routineDate, childId);
  const items = state.routines[childId] || [];
  const i = log.done.indexOf(itemId);
  if (i >= 0) log.done.splice(i, 1);
  else log.done.push(itemId);

  if (items.length && log.done.length >= items.length && !log.sticker) {
    log.sticker = true;
    state.stars[childId] = (state.stars[childId] || 0) + 1;
    toast(`🌼 ${memberName(childId)} 오늘 루틴 완성! 스티커 1개`);
  }
  save();
  renderRoutine();
  renderWeekBoard();
  renderQuests();
}

/* ---------------- 학교 자료: 시간표 · 급식 ---------------- */
/* 볼트를 열면 여기에 채워집니다. 그전에는 비어 있어 카드가 숨어 있어요. */
let SD = null;

function schoolAvailable() { return !!(SD && SD.timetable && SD.timetable.children); }
function mealAvailable() { return !!(SD && SD.meals && SD.meals.days); }
function schoolMeta(childId) { return schoolAvailable() ? SD.timetable.children[childId] : null; }
function childGrade(childId) {
  return (SD && SD.school && SD.school.classOf && SD.school.classOf[childId]) || '';
}
function minutesOf(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function nowMinutes() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
function timeRange(item) { return item.s && item.e ? `${item.s}–${item.e}` : (item.s || '시간 미정'); }
function itemKindClass(item) { return 'kind-' + (item.kind || 'etc'); }
function hasOverride(childId, dow) {
  const o = state.scheduleOverrides && state.scheduleOverrides[childId];
  return !!(o && Object.prototype.hasOwnProperty.call(o, String(dow)));
}
function dayItems(childId, dow) {
  if (hasOverride(childId, dow)) {
    const arr = state.scheduleOverrides[childId][String(dow)];
    return Array.isArray(arr) ? arr : [];
  }
  const meta = schoolMeta(childId);
  return (meta && meta.days && meta.days[String(dow)]) || [];
}
function sortByTime(items) {
  return items.slice().sort((a, b) => (minutesOf(a.s) == null ? 9999 : minutesOf(a.s)) - (minutesOf(b.s) == null ? 9999 : minutesOf(b.s)));
}
function scheduleFlags(items, nowM) {
  let nowIdx = -1;
  items.forEach((it, i) => {
    const s = minutesOf(it.s), e = minutesOf(it.e);
    if (s != null && e != null && nowM >= s && nowM < e) nowIdx = i;
  });
  const nextIdx = items.findIndex(it => { const s = minutesOf(it.s); return s != null && s >= nowM; });
  const flags = items.map((it, i) => {
    const e = minutesOf(it.e);
    if (i === nowIdx) return 'now';
    if (i === nextIdx) return 'next';
    if (e != null && e <= nowM) return 'past';
    return '';
  });
  return { flags, nowIdx, nextIdx };
}
function nextScheduleLabel(childId, dow) {
  for (let k = 1; k <= 7; k++) {
    const d = (dow + k) % 7;
    const items = sortByTime(dayItems(childId, d));
    if (items.length) {
      const first = items[0];
      const when = k === 1 ? '내일' : `${DOW[d]}요일`;
      return `${when} ${first.s} ${first.title}`;
    }
  }
  return '';
}

/* 다음 날 첫 일정 (오늘 카드 아래에 작게) */
function nextDayHint(childId, dow) {
  for (let k = 1; k <= 7; k++) {
    const d = (dow + k) % 7;
    const items = sortByTime(dayItems(childId, d));
    if (items.length) {
      const first = items[0];
      const extra = items.length > 1 ? ` 외 ${items.length - 1}` : '';
      return `<div class="sched-nextup">${k === 1 ? '내일' : `${DOW[d]}요일`} 첫 일정 · ${esc(first.s)} ${esc(first.title)}${extra}</div>`;
    }
  }
  return '';
}

/* 오늘의 시간표 카드 */
function renderTodaySchedule() {
  const card = $('#cardSchedule');
  if (!card) return;
  if (!schoolAvailable()) { card.hidden = true; return; }
  card.hidden = false;

  const now = new Date();
  const dow = now.getDay();
  const nowM = nowMinutes();
  $('#scheduleStamp').textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 (${DOW[dow]})`;

  const kids = state.members.filter(m => isChild(m.id));
  $('#schedGrid').innerHTML = kids.map(m => {
    const meta = schoolMeta(m.id);
    if (!meta) return '';
    const items = sortByTime(dayItems(m.id, dow));
    const grade = meta.grade || childGrade(m.id);
    const head = `<div class="sched-head">
        <img class="sched-avatar" src="${m.img}" alt="${esc(m.name)}">
        <div class="sched-name">${esc(m.name)}<span>${esc(grade)}</span></div>
        ${scheduleFlagHTML(items, nowM)}
      </div>`;

    if (!items.length) {
      const next = nextScheduleLabel(m.id, dow);
      return `<div class="sched-col" data-child="${m.id}">${head}
        <div class="sched-empty">🌿 오늘은 학교·학원 일정이 없어요</div>
        ${next ? `<div class="sched-nextup">다음 일정 · ${esc(next)}</div>` : ''}
      </div>`;
    }
    const { flags } = scheduleFlags(items, nowM);
    const rows = items.map((it, i) => {
      const f = flags[i];
      const tags = { now: '지금', next: '다음', past: '', '': '' };
      return `<li class="sched-item ${itemKindClass(it)} ${f ? 'is-' + f : ''}">
        <span class="sched-time">${esc(it.s || '—')}<i>${esc(it.e || '')}</i></span>
        <span class="sched-body"><b>${esc(it.title)}</b>${it.note ? `<i>${esc(it.note)}</i>` : ''}</span>
        ${tags[f] ? `<span class="sched-tag">${tags[f]}</span>` : ''}
      </li>`;
    }).join('');
    return `<div class="sched-col" data-child="${m.id}">${head}<ol class="sched-list">${rows}</ol>${nextDayHint(m.id, dow)}</div>`;
  }).join('');
}

function scheduleFlagHTML(items, nowM) {
  if (!items.length) return '';
  const { flags, nowIdx, nextIdx } = scheduleFlags(items, nowM);
  if (nowIdx >= 0) return `<span class="sched-flag is-now">지금 ${esc(items[nowIdx].title)}</span>`;
  if (nextIdx >= 0) return `<span class="sched-flag">다음 ${esc(items[nextIdx].title)}</span>`;
  if (flags.every(f => f === 'past')) return `<span class="sched-flag is-done">오늘 일정 끝</span>`;
  return '';
}

/* 급식 카드 */
function mealFor(dateStr) { return mealAvailable() ? (SD.meals.days[dateStr] || null) : null; }
function nextMealDate(fromISO) {
  if (!mealAvailable()) return null;
  const base = parseISO(fromISO);
  for (let i = 1; i <= 14; i++) {
    const ds = isoDate(addDays(base, i));
    if (SD.meals.days[ds]) return ds;
  }
  return null;
}
function algLabel(nums) {
  const legend = (SD && SD.meals && SD.meals.legend) || {};
  return (nums || []).map(n => `${n}.${legend[n] || ''}`.replace(/\.$/, '')).join(', ');
}
function dishListHTML(meal, withAlg) {
  if (!meal) return '';
  return `<ul class="meal-dishes">${meal.dishes.map(d => `<li><span class="dname">${esc(d.name)}</span>${withAlg && d.alg && d.alg.length ? `<span class="alg" title="알레르기 ${esc(algLabel(d.alg))}">${d.alg.join('·')}</span>` : ''}</li>`).join('')}</ul>`;
}

function renderTodayMeal() {
  const card = $('#cardMeal');
  if (!card) return;
  if (!mealAvailable()) { card.hidden = true; return; }
  card.hidden = false;
  $('#mealSchool').textContent = `${SD.meals.school} · 점심`;

  const today = todayISO();
  let date = today;
  let meal = mealFor(today);
  const isNext = !meal;
  if (!meal) {
    const nd = nextMealDate(today);
    if (!nd) { $('#mealToday').innerHTML = `<div class="meal-empty">이번 달 식단 정보가 아직 없어요.<br>마지막으로 받은 자료는 ${esc(SD.meals.month.split('-')[1])}월이에요.</div>`; return; }
    date = nd; meal = mealFor(nd);
  }

  const nextDate = isoDate(addDays(parseISO(date), 1));
  const nextMeal = mealFor(nextDate);
  const nextDow = DOW[parseISO(nextDate).getDay()];
  const nextLine = nextMeal
    ? `<div class="meal-next"><b>내일(${nextDow}) 미리보기</b> · ${nextMeal.dishes.slice(0, 4).map(d => esc(d.name)).join(' · ')}${nextMeal.dishes.length > 4 ? ` 외 ${nextMeal.dishes.length - 4}` : ''}</div>`
    : `<div class="meal-next">다음 급식일은 ${nextMealDate(date) ? esc(mdLabel(nextMealDate(date))) : '아직 몰라요'}</div>`;

  $('#mealToday').innerHTML = `
    <div class="meal-top">
      <span class="meal-day">${esc(mdLabel(date))}</span>
      ${isNext ? '<span class="badge">다음 급식</span>' : ''}
      <span class="meal-cal">${esc(meal.cal)} kcal</span>
    </div>
    ${dishListHTML(meal, true)}
    ${nextLine}
    <div class="meal-actions">
      <button type="button" class="mini-btn" data-mealview="week">${mealWeekLabel()} 식단</button>
      <button type="button" class="mini-btn" data-mealview="month">11월 전체</button>
    </div>`;
}

/* 급식 식단표 모달 (주간 / 월간) */
function mealWeekMonday(fromISO) {
  const base = parseISO(fromISO || todayISO());
  const monday = addDays(base, -((base.getDay() + 6) % 7));
  return (base.getDay() === 0 || base.getDay() === 6) ? addDays(monday, 7) : monday;
}
function mealWeekLabel(fromISO) {
  const d = parseISO(fromISO || todayISO()).getDay();
  return (d === 0 || d === 6) ? '다음 주' : '이번 주';
}
function mealMissingText(dateStr) {
  const d = parseISO(dateStr).getDay();
  return (d === 0 || d === 6) ? '주말' : '식단 정보 없음';
}

function weekMealsHTML() {
  const monday = mealWeekMonday(todayISO());
  const rows = [0, 1, 2, 3, 4].map(i => {
    const d = addDays(monday, i);
    const ds = isoDate(d);
    const m = mealFor(ds);
    const cls = ds === todayISO() ? 'mw-row is-today' : 'mw-row';
    return `<div class="${cls}">
      <div class="mw-date">${d.getMonth() + 1}/${d.getDate()}<span>${DOW[d.getDay()]}요일</span></div>
      <div>
        ${m ? `<div class="mw-menu">${m.dishes.map(x => `${esc(x.name)}${x.alg && x.alg.length ? ` <span class="alg">${x.alg.join('·')}</span>` : ''}`).join(', ')}</div><div class="mw-cal">${esc(m.cal)} kcal</div>` : `<div class="mw-menu" style="color:#B3A08D">${mealMissingText(ds)}</div>`}
      </div>
    </div>`;
  }).join('');
  return `<div class="meal-week-table">${rows}</div>
    <p class="legend" style="margin-top:8px">알레르기 번호 · ${Object.entries(SD.meals.legend).map(([n, t]) => `${n}.${t}`).join('  ')}</p>
    <p class="hint" style="margin:4px 0 0">${esc(SD.meals.source)} (${esc(SD.meals.updated)} 조회) · 학교 사정에 따라 바뀔 수 있어요.</p>`;
}

function monthMealsHTML(selDate) {
  const [y, mo] = String(SD.meals.month).split('-').map(Number);
  const first = new Date(y, mo - 1, 1);
  const lastDay = new Date(y, mo, 0).getDate();
  const selected = selDate || (mealFor(todayISO()) ? todayISO() : (Object.keys(SD.meals.days).sort()[0] || ''));
  const monthDays = Object.keys(SD.meals.days).filter(k => k.startsWith(SD.meals.month)).sort();

  let cells = DOW.map((d, i) => `<div class="mcal-head ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>`).join('');
  for (let i = 0; i < first.getDay(); i++) cells += `<div class="mcal-day is-blank"></div>`;
  for (let d = 1; d <= lastDay; d++) {
    const ds = `${y}-${pad(mo)}-${pad(d)}`;
    const m = mealFor(ds);
    const cls = ['mcal-day'];
    if (m) cls.push('has-meal'); else cls.push('no-meal');
    if (ds === todayISO()) cls.push('is-today');
    if (m && ds === selected) cls.push('is-sel');
    const inner = `<span class="num">${d}</span>` + (m ? `<span class="menu">${m.dishes.slice(0, 3).map(x => esc(x.name)).join('<br>')}</span>` : '');
    cells += m
      ? `<button type="button" class="${cls.join(' ')}" data-mealdate="${ds}">${inner}</button>`
      : `<div class="${cls.join(' ')}">${inner}</div>`;
  }

  return `<div class="meal-cal-wrap">
      <div class="meal-cal-grid">${cells}</div>
      <div id="mealDetail">${mealDetailHTML(selected)}</div>
      <p class="legend">알레르기 번호 · ${Object.entries(SD.meals.legend).map(([n, t]) => `${n}.${t}`).join('  ')}</p>
      <p class="hint" style="margin:0">${monthDays.length}일치 식단이 들어 있어요 · ${esc(SD.meals.source)} (${esc(SD.meals.updated)} 조회)</p>
    </div>`;
}

function mealDetailHTML(dateStr) {
  const m = mealFor(dateStr);
  if (!m) return `<div class="meal-detail"><div class="dd">${esc(mdLabel(dateStr))}<span>급식 없음</span></div></div>`;
  const mainKeys = ['쇠고기(종류)', '돼지고기', '닭고기', '오리고기', '쌀', '배추', '고춧가루', '콩'];
  const originText = mainKeys.filter(k => m.origin && m.origin[k]).map(k => `${k.replace('(종류)', '')} ${m.origin[k]}`).join(' · ');
  return `<div class="meal-detail">
    <div class="dd">${esc(mdLabel(dateStr))}<span>${esc(m.cal)} kcal</span></div>
    <ul>${m.dishes.map(d => `<li>· ${esc(d.name)}${d.alg && d.alg.length ? ` <span class="alg" title="${esc(algLabel(d.alg))}">${d.alg.join('·')}</span>` : ''}</li>`).join('')}</ul>
    ${originText ? `<div class="origin"><b>원산지</b> · ${esc(originText)}</div>` : ''}
  </div>`;
}

function mealModalHTML(view, selDate) {
  const isMonth = view === 'month';
  return `<div id="mealBox">
    <div class="meal-tabs">
      <button type="button" data-mealview="week" class="${!isMonth ? 'is-active' : ''}">${mealWeekLabel()}</button>
      <button type="button" data-mealview="month" class="${isMonth ? 'is-active' : ''}">${SD.meals.month.split('-')[1]}월 전체</button>
    </div>
    ${isMonth ? monthMealsHTML(selDate) : weekMealsHTML()}
  </div>`;
}

function openMealModal(view, selDate) {
  if (!mealAvailable()) { toast('급식 자료가 아직 없어요'); return; }
  let cur = view === 'month' ? 'month' : 'week';
  let sel = selDate || null;
  openModal('🍱 급식 식단표', mealModalHTML(cur, sel), body => {
    const box = body.querySelector('#mealBox');
    if (!box) return;
    const paint = () => { body.innerHTML = mealModalHTML(cur, sel); bindBox(); };
    function bindBox() {
      const b = body.querySelector('#mealBox');
      b.onclick = e => {
        const tab = e.target.closest('[data-mealview]');
        if (tab) { cur = tab.dataset.mealview; paint(); return; }
        const day = e.target.closest('[data-mealdate]');
        if (day) { sel = day.dataset.mealdate; paint(); }
      };
    }
    bindBox();
  });
}

/* 하루 루틴: 이번 주 급식 */
function renderMealWeek() {
  const wrap = $('#mealWeek');
  if (!wrap) return;
  const section = wrap.closest('section');
  if (!mealAvailable()) { if (section) section.hidden = true; return; }
  if (section) section.hidden = false;
  const isTodayView = routineDate === todayISO();
  const base = parseISO(routineDate);
  let monday = addDays(base, -((base.getDay() + 6) % 7));
  if (isTodayView && (base.getDay() === 0 || base.getDay() === 6)) monday = addDays(monday, 7);
  const friday = addDays(monday, 4);
  const label = isTodayView ? mealWeekLabel() : '이번 주';
  $('#mealWeekNote').textContent = `${label} · ${monday.getMonth() + 1}/${monday.getDate()} ~ ${friday.getMonth() + 1}/${friday.getDate()} · ${SD.meals.school}`;
  wrap.innerHTML = [0, 1, 2, 3, 4].map(i => {
    const d = addDays(monday, i);
    const ds = isoDate(d);
    const m = mealFor(ds);
    const cls = ds === todayISO() ? 'mw-row is-today' : 'mw-row';
    return `<div class="${cls}">
      <div class="mw-date">${d.getMonth() + 1}/${d.getDate()}<span>${DOW[d.getDay()]}</span></div>
      <div>${m ? `<div class="mw-menu">${m.dishes.map(x => esc(x.name)).join(' · ')}</div><div class="mw-cal">${esc(m.cal)} kcal</div>` : `<div class="mw-menu" style="color:#B3A08D">${mealMissingText(ds)}</div>`}</div>
    </div>`;
  }).join('');
}

/* 하루 루틴: 요일별 시간표 */
function renderTimetable() {
  const wrap = $('#timetableWrap');
  if (!wrap) return;
  if (!schoolAvailable()) { wrap.innerHTML = '<p class="empty-note">시간표 자료가 아직 없어요</p>'; return; }
  const todayDow = new Date().getDay();
  const kids = state.members.filter(m => isChild(m.id));
  wrap.innerHTML = kids.map(m => {
    const meta = schoolMeta(m.id);
    if (!meta) return '';
    const days = [1, 2, 3, 4, 5].concat(dayItems(m.id, 6).length ? [6] : []);
    const cells = days.map(d => {
      const items = sortByTime(dayItems(m.id, d));
      const dowCls = d === 0 ? 'sun' : d === 6 ? 'sat' : '';
      return `<div class="wt-day ${d === todayDow ? 'is-today' : ''}">
        <button type="button" class="wt-dow ${dowCls}" data-tt-child="${m.id}" data-tt-dow="${d}" title="눌러서 고치기">${DOW[d]}${hasOverride(m.id, d) ? ' ✎' : ''}</button>
        <div class="wt-items">
          ${items.length ? items.map(it => `<button type="button" class="wt-item ${itemKindClass(it)}" data-tt-child="${m.id}" data-tt-dow="${d}">
            <span class="time">${esc(timeRange(it))}</span>
            <span class="name">${esc(it.title)}</span>
            ${it.note ? `<span class="note">${esc(it.note)}</span>` : ''}
          </button>`).join('') : '<div class="wt-empty">일정 없음</div>'}
        </div>
      </div>`;
    }).join('');
    return `<div class="tt-block">
      <div class="tt-title"><img src="${m.img}" alt="">${esc(m.name)} 시간표 <span class="tt-sub">${esc(meta.grade || childGrade(m.id))} · ${esc(SD.timetable.updated)} 기준</span></div>
      <div class="week-tt" style="--tt-cols:${days.length}">${cells}</div>
      ${meta.shuttle ? `<div class="tt-shuttle">${esc(meta.shuttle)}</div>` : ''}
      <div class="tt-foot">
        <button type="button" class="mini-btn" data-tt-reset="${m.id}">기본 시간표로 되돌리기</button>
        <span class="tt-src">요일을 누르면 그날 시간표를 고칠 수 있어요 · 출처: ${esc(SD.timetable.source || '')}</span>
      </div>
    </div>`;
  }).join('');
  const note = $('#timetableNote');
  if (note) note.textContent = '요일을 누르면 그날 시간표를 고칠 수 있어요';
}

function guessKind(title) {
  if (/학교/.test(title)) return 'school';
  if (/방과후/.test(title)) return 'afterschool';
  if (/줄넘기|수영|축구|운동|배드민턴|태권도/.test(title)) return 'sport';
  if (/독서|학습|숙제|받아쓰기|복습|예습/.test(title)) return 'study';
  if (/학원|영어|수학|논술|피아노|미술|코딩|로봇|클라리넷|바이올린/.test(title)) return 'academy';
  return 'academy';
}

function parseScheduleText(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const m = line.match(/^(\d{1,2}:\d{2})\s*[-~–]\s*(\d{1,2}:\d{2})\s+(.+)$/);
    if (!m) return { s: '', e: '', title: line, kind: guessKind(line), note: '' };
    let rest = m[3].trim();
    let note = '';
    const paren = rest.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (paren) { rest = paren[1].trim(); note = paren[2].trim(); }
    const parts = rest.split(/\s*[·|]\s*/);
    const title = parts[0].trim();
    if (parts.length > 1) note = [note, parts.slice(1).join(' · ')].filter(Boolean).join(' · ');
    return { s: m[1], e: m[2], title, kind: guessKind(title), note };
  });
}

function openScheduleDayModal(childId, dow) {
  const m = memberById(childId);
  const items = sortByTime(dayItems(childId, dow));
  const text = items.map(it => `${it.s || ''}${it.e ? '-' + it.e : ''} ${it.title}${it.note ? ' · ' + it.note : ''}`.trim()).join('\n');
  openModal(`${m ? m.name : '아이'} · ${DOW[dow]}요일 시간표`, `
    <p class="hint" style="margin:0">한 줄에 하나씩 적어 주세요.<br>예) <b>08:40-14:30 학교 · 6교시</b> / <b>16:20-19:05 영어 · 학원</b></p>
    <form class="form" id="ttForm">
      <label class="field"><span>${DOW[dow]}요일</span>
        <textarea name="tt" rows="7" placeholder="08:40-14:30 학교 · 6교시">${esc(text)}</textarea>
      </label>
      <div class="modal-actions">
        <button type="button" class="soft-btn" data-act="reset">기본값으로</button>
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">취소</button>
        <button type="submit" class="primary-btn">저장</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('#ttForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const parsed = parseScheduleText(form.elements.tt.value);
      if (!state.scheduleOverrides[childId]) state.scheduleOverrides[childId] = {};
      state.scheduleOverrides[childId][String(dow)] = parsed;
      save(); closeModal();
      renderTimetable(); renderTodaySchedule(); renderRoutine();
      toast(`${DOW[dow]}요일 시간표를 저장했어요`);
    });
    body.querySelector('[data-act=cancel]').onclick = closeModal;
    body.querySelector('[data-act=reset]').onclick = () => {
      if (state.scheduleOverrides[childId]) delete state.scheduleOverrides[childId][String(dow)];
      save(); closeModal(); renderTimetable(); renderTodaySchedule();
      toast('기본 시간표로 되돌렸어요');
    };
  });
}

/* ---------------- 학습 챌린지 · 모험 ---------------- */
function levelOf(stars) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (stars >= l.min) idx = i; });
  const cur = LEVELS[idx], next = LEVELS[idx + 1] || null;
  const pct = next ? Math.round(((stars - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { cur, next, pct };
}

function renderQuests() {
  const children = state.members.filter(m => isChild(m.id));
  $('#questGrid').innerHTML = children.map(m => {
    const missions = state.quests.filter(q => q.child === m.id);
    const stars = state.stars[m.id] || 0;
    const lv = levelOf(stars);

    const missionHtml = missions.length ? missions.map(q => {
      const pct = Math.min(100, Math.round((q.progress / q.goal) * 100));
      const dots = Array.from({ length: Math.min(q.goal, 12) }).map((_, i) => {
        const on = q.goal <= 12 ? i < q.progress : (i / 12) < (q.progress / q.goal);
        return `<i class="${on ? 'on' : ''}"></i>`;
      }).join('');
      return `<div class="mission ${q.done ? 'is-done' : ''}" data-id="${q.id}">
        <span class="mission-emoji">${esc(q.emoji || '⭐')}</span>
        <div class="mission-main">
          <div class="mission-title">${esc(q.title)}</div>
          <div class="mission-sub">${q.progress}/${q.goal}${q.reward ? ' · 보상: ' + esc(q.reward) : ''}</div>
          <div class="mission-dots">${dots}</div>
        </div>
        <div class="mission-actions">
          ${q.done ? `<span class="mission-done-tag">완료 🎉</span>` : `<button type="button" class="mission-plus" data-act="plus">＋ 하나 했어요</button>`}
          <button type="button" class="mission-del" data-act="del" aria-label="미션 삭제">✕</button>
        </div>
      </div>`;
    }).join('') : `<p class="empty-note">아직 미션이 없어요.<br>아래에서 하나 더해 보세요</p>`;

    return `<div class="quest-col" data-child="${m.id}">
      <div class="quest-head">
        <img class="child-avatar" src="${m.img}" alt="${esc(m.name)}">
        <div>
          <div class="child-name">${esc(m.name)}의 모험</div>
          <div class="level-name">${lv.cur.emoji} ${lv.cur.name}${lv.next ? ` · 다음 단계까지 ${lv.next.min - stars}개` : ' · 최고 단계!'}</div>
          <div class="level-bar"><i style="width:${lv.pct}%"></i></div>
        </div>
        <div class="star-total"><b>⭐ ${stars}</b><span>모은 별</span></div>
      </div>
      <div class="mission-list">${missionHtml}</div>
      <div class="quest-add"><button type="button" data-act="add">＋ 미션 추가</button></div>
    </div>`;
  }).join('');

  renderAdventure();
}

function renderAdventure() {
  const a = state.adventure;
  const box = $('#adventureResult');
  if (!a) { box.hidden = true; return; }
  box.hidden = false;
  $('#advEmoji').textContent = a.emoji;
  $('#advTitle').textContent = a.title;
  $('#advDesc').textContent = a.desc;
}

function pickAdventure() {
  let pick = ADVENTURES[Math.floor(Math.random() * ADVENTURES.length)];
  if (state.adventure && pick.title === state.adventure.title) {
    pick = ADVENTURES[(ADVENTURES.indexOf(pick) + 5) % ADVENTURES.length];
  }
  state.adventure = pick;
  save(); renderAdventure();
}

function openQuestModal(childId) {
  openModal('새 미션', `
    <form class="form">
      <label class="field"><span>누구의 모험인가요?</span>
        <select name="child">
          ${state.members.filter(m => isChild(m.id)).map(m => `<option value="${m.id}" ${m.id === childId ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        </select>
      </label>
      <div class="row-2">
        <label class="field"><span>이모지</span><input name="emoji" maxlength="4" value="📚"></label>
        <label class="field"><span>목표 횟수</span><input name="goal" type="number" min="1" max="50" value="5"></label>
      </div>
      <label class="field"><span>미션</span>
        <input name="title" maxlength="30" placeholder="예: 책 3권 읽기" required>
      </label>
      <label class="field"><span>보상 (선택)</span>
        <input name="reward" maxlength="30" placeholder="예: 좋아하는 간식">
      </label>
      <div class="modal-actions">
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">취소</button>
        <button type="submit" class="primary-btn">추가</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const title = form.elements.title.value.trim();
      if (!title) { form.elements.title.focus(); return; }
      const goal = clamp(Number(form.elements.goal.value) || 5, 1, 50);
      state.quests.push({
        id: uid(), child: form.elements.child.value, emoji: form.elements.emoji.value.trim() || '⭐',
        title, goal, progress: 0, reward: form.elements.reward.value.trim(), done: false
      });
      save(); closeModal(); renderQuests(); toast('미션을 추가했어요');
    });
    form.querySelector('[data-act=cancel]').onclick = closeModal;
  });
}

function questPlus(q) {
  if (q.done) return;
  q.progress = Math.min(q.progress + 1, q.goal);
  state.stars[q.child] = (state.stars[q.child] || 0) + 1;
  let justDone = false;
  if (q.progress >= q.goal) {
    q.done = true;
    justDone = true;
    state.stars[q.child] += 2;
  }
  save(); renderQuests();
  if (justDone) toast(`🎉 ${memberName(q.child)} 미션 완료! 별 3개를 받았어요`);
  else toast('⭐ 별 1개를 받았어요');
}

/* ---------------- 설정 · 백업 ---------------- */
function pinSettingsHTML() {
  if (!HAS_WEBCRYPTO) {
    return `<div class="pin-status off">🔒 이 브라우저에서는 암호화 잠금을 쓸 수 없어요.<br>https 주소로 열면 사용할 수 있어요.</div>`;
  }
  if (vault) {
    return `<div class="pin-status">🔒 가족 잠금 사용 중 · 시간표·급식·일정까지 암호화되어 있어요</div>
      <p class="hint" style="margin:0">앱을 열 때 PIN 4자리를 물어요. 이 기기의 기록도 같은 PIN 열쇠로 암호화해 저장해요.<br>PIN은 암호화된 자료 파일에 묶여 있어 여기서 바꿀 수 없어요.</p>
      <div class="btn-row">
        <button type="button" class="soft-btn" id="btnPinNow">지금 잠그기</button>
      </div>`;
  }
  if (pinLock && pinLock.enabled) {
    return `<div class="pin-status">🔒 가족 잠금 사용 중 · 기록이 암호화되어 저장돼요</div>
      <p class="hint" style="margin:0">앱을 열 때 PIN 4자리를 물어요. PIN을 잊으면 기록을 열 수 없으니 꼭 기억해 주세요.</p>
      <div class="btn-row">
        <button type="button" class="soft-btn" id="btnPinChange">PIN 바꾸기</button>
        <button type="button" class="soft-btn" id="btnPinNow">지금 잠그기</button>
        <button type="button" class="danger-btn" id="btnPinOff">잠금 해제</button>
      </div>`;
  }
  return `<div class="pin-status off">🔓 지금은 잠금 없이 바로 열려요</div>
    <p class="hint" style="margin:0">PIN 4자리를 정하면 이 기기의 기록(캘린더·할 일·편지·루틴)이 Web Crypto AES-GCM으로 암호화되어 저장되고, 앱을 열 때 PIN을 물어요. 집에서 함께 쓰는 가족 잠금이에요.</p>
    <div class="btn-row"><button type="button" class="soft-btn" id="btnPinSet">PIN 설정하기</button></div>`;
}

async function enablePin(pin) {
  const salt = b64.enc(crypto.getRandomValues(new Uint8Array(16)));
  const key = await deriveKey(pin, salt, PIN_ITERATIONS);
  const env = await encryptJSON(key, state);
  pinLock = { v: 1, enabled: true, salt, iterations: PIN_ITERATIONS, createdAt: Date.now() };
  stateKey = key;
  localStorage.setItem(PIN_LOCK_KEY, JSON.stringify(pinLock));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
}

function disablePin() {
  clearTimeout(encSaveTimer);
  stateKey = null;
  pinLock = null;
  localStorage.removeItem(PIN_LOCK_KEY);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { toast('저장 공간이 부족해 기록을 저장하지 못했어요'); }
}

function openPinModal() {
  if (!HAS_WEBCRYPTO) { toast('이 브라우저에서는 잠금을 쓸 수 없어요'); return; }
  openModal(pinLock && pinLock.enabled ? 'PIN 바꾸기' : '가족 PIN 설정', `
    <p class="hint" style="margin:0">숫자 4자리를 정해 주세요. 이 PIN으로 기록을 암호화하고, 앱을 열 때 물어봐요.</p>
    <form class="form" id="pinForm">
      <label class="field pin-field"><span>새 PIN 4자리</span><input name="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="••••"></label>
      <label class="field pin-field"><span>한 번 더</span><input name="pin2" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="••••"></label>
      <p class="hint" id="pinMsg" style="margin:0"></p>
      <div class="modal-actions">
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">취소</button>
        <button type="submit" class="primary-btn">저장</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('#pinForm');
    const msg = body.querySelector('#pinMsg');
    form.elements.pin.focus();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const p1 = String(form.elements.pin.value || '').trim();
      const p2 = String(form.elements.pin2.value || '').trim();
      if (!/^\d{4}$/.test(p1)) { msg.textContent = '숫자 4자리로 정해 주세요.'; return; }
      if (p1 !== p2) { msg.textContent = '두 번 입력한 PIN이 달라요.'; return; }
      msg.textContent = '잠그는 중…';
      try {
        await enablePin(p1);
        closeModal();
        renderAll();
        toast('🔒 가족 잠금을 켰어요');
      } catch (err) {
        msg.textContent = '잠금을 켜지 못했어요. 다시 해 주세요.';
      }
    });
    body.querySelector('[data-act=cancel]').onclick = closeModal;
  });
}

function openSettingsModal() {
  const loc = currentLocation();
  openModal('설정 · 백업', `
    <form class="form" id="settingsForm">
      <div class="settings-block">
        <div class="settings-title">집 이름</div>
        <label class="field"><input name="houseName" maxlength="20" value="${esc(state.houseName)}"></label>
      </div>
      <div class="settings-block">
        <div class="settings-title">날씨 위치</div>
        <div class="btn-row">
          <button type="button" class="soft-btn" id="btnOpenLoc">📍 날씨 위치 · ${esc(loc.label)}</button>
        </div>
      </div>
      <div class="settings-block">
        <div class="settings-title">가족 잠금 (PIN 4자리)</div>
        ${pinSettingsHTML()}
      </div>
      <div class="settings-block">
        <div class="settings-title">백업</div>
        <p class="hint" style="margin:0">기기를 바꾸거나 브라우저를 지우기 전에 내보내 두세요.</p>
        <div class="btn-row">
          <button type="button" class="soft-btn" id="btnExport">JSON 내보내기</button>
          <span class="soft-btn file-btn">JSON 가져오기<input type="file" id="importFile" accept="application/json,.json"></span>
        </div>
      </div>
      <div class="settings-block">
        <div class="settings-title">처음부터</div>
        <div class="btn-row">
          <button type="button" class="danger-btn" id="btnReset">모든 기록 지우기</button>
        </div>
      </div>
      <p class="hint" style="margin:0">이 앱은 서버 없이 브라우저 안에서만 동작해요. 기록은 이 기기의 localStorage에 저장되고, 어디에도 전송되지 않아요. PIN 잠금을 켜면 그 기록이 AES-GCM으로 암호화되어 저장돼요.</p>
      <div class="modal-actions">
        <span class="spacer"></span>
        <button type="button" class="soft-btn" data-act="cancel">닫기</button>
        <button type="submit" class="primary-btn">저장</button>
      </div>
    </form>`, body => {
    const form = body.querySelector('#settingsForm');

    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = form.elements.houseName.value.trim();
      if (v) state.houseName = v;
      save(); renderHeader(); closeModal(); toast('설정을 저장했어요');
    });
    form.querySelector('[data-act=cancel]').onclick = closeModal;

    body.querySelector('#btnOpenLoc').onclick = () => { closeModal(); setTimeout(openLocationModal, 120); };

    const pinSet = body.querySelector('#btnPinSet');
    if (pinSet) pinSet.onclick = () => { closeModal(); setTimeout(openPinModal, 120); };
    const pinChg = body.querySelector('#btnPinChange');
    if (pinChg) pinChg.onclick = () => { closeModal(); setTimeout(openPinModal, 120); };
    const pinNow = body.querySelector('#btnPinNow');
    if (pinNow) pinNow.onclick = () => { closeModal(); location.reload(); };
    const pinOff = body.querySelector('#btnPinOff');
    if (pinOff) pinOff.onclick = () => {
      confirmModal('잠금을 해제할까요?', '이 기기의 기록이 더 이상 암호화되지 않아요. 앱을 열 때 PIN도 물어보지 않아요.', '해제하기', () => {
        disablePin(); renderAll(); toast('잠금을 해제했어요');
      }, true);
    };

    body.querySelector('#btnExport').onclick = () => {
      const data = JSON.stringify(state, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `urijip-backup-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('백업 파일을 내려받았어요');
    };

    body.querySelector('#importFile').onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!parsed || typeof parsed !== 'object') throw new Error('bad');
          state = mergeState(parsed);
          save();
          closeModal();
          renderAll();
          toast('백업을 불러왔어요');
        } catch (err) {
          toast('백업 파일을 읽지 못했어요');
        }
      };
      reader.readAsText(file);
    };

    body.querySelector('#btnReset').onclick = () => {
      confirmModal('모든 기록을 지울까요?', '캘린더·할 일·편지·루틴이 모두 사라지고 처음 상태로 돌아가요. 되돌릴 수 없어요.', '지우기', () => {
        state = createFirstState();
        save();
        selectedDate = todayISO();
        routineDate = todayISO();
        const now = new Date();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();
        renderAll();
        toast('처음 상태로 돌아갔어요');
      }, true);
    };
  });
}

/* ---------------- 전체 렌더 ---------------- */
function renderAll() {
  renderHeader();
  renderAssigneeOptions();
  renderCalendar();
  renderTodos();
  renderDinner();
  renderStatus();
  renderLetters();
  renderRoutine();
  renderWeekBoard();
  renderQuests();
  renderTimetable();
  renderTodaySchedule();
  renderTodayMeal();
  renderMealWeek();
  if (state.weatherCache) renderWeather(state.weatherCache, false);
  $('#locLabel').textContent = currentLocation().label;
}

/* ---------------- 이벤트 연결 ---------------- */
function bindEvents() {
  // 탭
  $$('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // 시계
  tickClock();
  setInterval(tickClock, 15000);

  // 달력
  $('#calPrev').onclick = () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  };
  $('#calNext').onclick = () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  };
  $('#calToday').onclick = () => {
    const n = new Date();
    viewYear = n.getFullYear(); viewMonth = n.getMonth();
    selectedDate = todayISO();
    renderCalendar();
  };
  $('#calGrid').addEventListener('click', e => {
    const btn = e.target.closest('.cal-day');
    if (!btn) return;
    selectedDate = btn.dataset.date;
    const d = parseISO(selectedDate);
    viewYear = d.getFullYear(); viewMonth = d.getMonth();
    renderCalendar();
  });
  $('#btnAddEvent').onclick = () => openEventModal(null, selectedDate);
  $('#dayEvents').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const ev = state.events.find(x => x.id === del.dataset.del);
      if (!ev) return;
      confirmModal('일정을 지울까요?', `"${ev.title}" 일정이 사라져요.`, '지우기', () => {
        state.events = state.events.filter(x => x.id !== ev.id);
        save(); renderCalendar(); toast('일정을 지웠어요');
      }, true);
      return;
    }
    const item = e.target.closest('.ev');
    if (item) {
      const ev = state.events.find(x => x.id === item.dataset.id);
      if (ev) openEventModal(ev);
    }
  });

  // 날씨
  $('#btnWeatherRefresh').onclick = () => { toast('날씨를 새로 불러오는 중…'); loadWeather(); };
  $('#btnLoc').onclick = openLocationModal;

  // 할 일
  $$('#todoTabs .seg-btn').forEach(b => b.addEventListener('click', () => {
    todoList = b.dataset.list; renderTodos();
  }));
  $('#todoForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#todoInput');
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    const item = {
      id: uid(), text,
      who: $('#todoAssignee').value || '',
      due: $('#todoDue').value || '',
      done: false, created: Date.now()
    };
    listOf(todoList).push(item);
    input.value = '';
    $('#todoDue').value = '';
    save(); renderTodos();
    input.focus();
  });
  $('#todoList').addEventListener('click', e => {
    const li = e.target.closest('.check-item');
    if (!li) return;
    const list = listOf(todoList);
    const item = list.find(x => x.id === li.dataset.id);
    if (!item) return;
    if (e.target.closest('[data-act=toggle]')) {
      item.done = !item.done;
      save(); renderTodos();
    } else if (e.target.closest('[data-act=del]')) {
      const kind = todoList === 'shopping' ? '장보기' : '할 일';
      confirmModal(`${kind}를 지울까요?`, `"${item.text}" 항목이 사라져요.`, '지우기', () => {
        const idx = list.findIndex(x => x.id === item.id);
        if (idx >= 0) list.splice(idx, 1);
        save(); renderTodos(); toast('지웠어요');
      }, true);
    }
  });

  // 저녁
  $('#btnDinnerChange').onclick = openDinnerModal;
  $('#btnDinnerClear').onclick = () => {
    if (!state.dinner.menu) { toast('먼저 메뉴를 정해 주세요'); return; }
    confirmModal('저녁 메뉴를 비울까요?', '오늘의 저녁 메뉴를 지우고 다시 고를 수 있어요.', '비우기', () => {
      state.dinner.menu = '';
      state.dinner.updatedAt = null;
      save(); renderDinner(); toast('메뉴를 비웠어요');
    });
  };

  // 가족 상태
  $('#statusGrid').addEventListener('click', e => {
    const btn = e.target.closest('.member');
    if (!btn) return;
    const m = memberById(btn.dataset.id);
    if (m) openMemberModal(m);
  });
  $('#btnEditMembers').onclick = openMembersModal;

  // 우체통
  $('#btnNewLetter').onclick = openLetterModal;
  $('#letterList').addEventListener('click', e => {
    const li = e.target.closest('.letter');
    if (!li) return;
    const letter = state.letters.find(l => l.id === li.dataset.id);
    if (!letter) return;
    if (e.target.closest('[data-act=read]')) {
      letter.read = !letter.read;
      save(); renderLetters();
    } else if (e.target.closest('[data-act=del]')) {
      confirmModal('편지를 지울까요?', '이 편지가 우체통에서 사라져요.', '지우기', () => {
        state.letters = state.letters.filter(l => l.id !== letter.id);
        save(); renderLetters(); toast('편지를 지웠어요');
      }, true);
    }
  });

  // 루틴
  $('#weekSwitch').addEventListener('click', e => {
    const b = e.target.closest('button[data-date]');
    if (!b) return;
    routineDate = b.dataset.date;
    renderRoutine(); renderWeekBoard();
  });
  $('#routineGrid').addEventListener('click', e => {
    const item = e.target.closest('.routine-item');
    if (item) {
      const child = item.dataset.child, id = item.dataset.item;
      if (e.target.closest('[data-act=toggle]')) { toggleRoutine(child, id); return; }
      if (e.target.closest('[data-act=del]')) {
        const it = (state.routines[child] || []).find(x => x.id === id);
        confirmModal('루틴을 지울까요?', `"${it ? it.text : ''}" 항목이 사라져요. 오늘 체크한 기록도 함께 지워져요.`, '지우기', () => {
          state.routines[child] = (state.routines[child] || []).filter(x => x.id !== id);
          Object.values(state.routineLog).forEach(log => {
            if (log[child] && Array.isArray(log[child].done)) log[child].done = log[child].done.filter(x => x !== id);
          });
          save(); renderRoutine(); renderWeekBoard(); toast('루틴을 지웠어요');
        }, true);
        return;
      }
      return;
    }
    const addBtn = e.target.closest('.routine-add button');
    if (addBtn) {
      const form = addBtn.closest('form');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });
  $('#routineGrid').addEventListener('submit', e => {
    const form = e.target.closest('.routine-add');
    if (!form) return;
    e.preventDefault();
    const child = form.dataset.child;
    const input = form.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    if (!Array.isArray(state.routines[child])) state.routines[child] = [];
    state.routines[child].push({ id: uid(), text });
    input.value = '';
    save(); renderRoutine(); renderWeekBoard();
  });
  $('#btnResetRoutine').onclick = () => {
    const log = state.routineLog[routineDate] || {};
    const any = Object.values(log).some(l => l && Array.isArray(l.done) && l.done.length);
    if (!any) { toast('지울 체크가 없어요'); return; }
    confirmModal('오늘 체크를 지울까요?', '오늘 체크한 루틴을 모두 풀어요. 받은 스티커는 그대로 남아요.', '지우기', () => {
      Object.values(log).forEach(l => { if (l) l.done = []; });
      save(); renderRoutine(); renderWeekBoard(); toast('체크를 지웠어요');
    });
  };

  // 시간표
  $('#timetableWrap').addEventListener('click', e => {
    const reset = e.target.closest('[data-tt-reset]');
    if (reset) {
      const id = reset.dataset.ttReset;
      confirmModal('기본 시간표로 되돌릴까요?', '직접 고친 시간표를 모두 지우고 노션에 저장된 2학기 시간표로 돌아가요.', '되돌리기', () => {
        state.scheduleOverrides[id] = {};
        save(); renderTimetable(); renderTodaySchedule();
        toast('기본 시간표로 되돌렸어요');
      });
      return;
    }
    const cell = e.target.closest('[data-tt-dow]');
    if (!cell) return;
    openScheduleDayModal(cell.dataset.ttChild, Number(cell.dataset.ttDow));
  });

  // 급식
  $('#mealToday').addEventListener('click', e => {
    const b = e.target.closest('[data-mealview]');
    if (b) openMealModal(b.dataset.mealview, todayISO());
  });
  $('#btnMealMonth').onclick = () => openMealModal('month');

  // 모험 · 미션
  $('#btnAdventure').onclick = pickAdventure;
  $('#btnAdventureAgain').onclick = pickAdventure;
  $('#btnAdventureCal').onclick = () => {
    if (!state.adventure) return;
    const a = state.adventure;
    state.events.push({
      id: uid(), title: a.title, date: todayISO(), endDate: '', time: '',
      memo: a.desc, color: state.events.length % EVENT_COLORS.length
    });
    save(); renderCalendar(); toast('캘린더에 담았어요 🎈');
  };
  $('#questGrid').addEventListener('click', e => {
    const col = e.target.closest('.quest-col');
    if (!col) return;
    const child = col.dataset.child;
    if (e.target.closest('[data-act=add]')) { openQuestModal(child); return; }
    const card = e.target.closest('.mission');
    if (!card) return;
    const q = state.quests.find(x => x.id === card.dataset.id);
    if (!q) return;
    if (e.target.closest('[data-act=plus]')) { questPlus(q); return; }
    if (e.target.closest('[data-act=del]')) {
      confirmModal('미션을 지울까요?', `"${q.title}" 미션이 사라져요.`, '지우기', () => {
        state.quests = state.quests.filter(x => x.id !== q.id);
        save(); renderQuests(); toast('미션을 지웠어요');
      }, true);
    }
  });

  // 설정 · 모달 닫기
  $('#btnSettings').onclick = openSettingsModal;
  $('#modalClose').onclick = closeModal;
  modalRoot.addEventListener('click', e => {
    if (e.target.dataset && e.target.dataset.close) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modalRoot.hidden) closeModal();
  });

  // 창을 다시 열었을 때 날짜가 바뀌었으면 새 날로
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const t = todayISO();
    if (routineDate > t) { routineDate = t; renderRoutine(); renderWeekBoard(); }
    renderHeader();
    renderTodaySchedule();
    renderTodayMeal();
    renderMealWeek();
  });
}

/* ---------------- 암호화 볼트 · 가족 잠금 화면 · 시작 ---------------- */
/* 볼트 파일 하나에 시간표·급식·네이버 공유 일정이 암호문으로 들어 있어요.
   PIN을 넣어야 Web Crypto(PBKDF2-SHA256 → AES-256-GCM)로 풀리고,
   풀린 자료는 이 탭의 메모리에만 남습니다. */
const VAULT_URL = 'data/family-vault.enc.json';
let vault = null;
let appStarted = false;

async function loadVaultFile() {
  try {
    const res = await fetch(VAULT_URL, { cache: 'no-store' });
    if (!res.ok) return { vault: null, status: res.status, error: 'HTTP ' + res.status };
    const data = await res.json();
    if (!data || !data.kdf || !data.cipher) return { vault: null, status: 0, error: '볼트 형식이 올바르지 않아요' };
    return { vault: data, status: 200, error: '' };
  } catch (e) {
    return { vault: null, status: 0, error: (e && e.message) || '볼트를 불러오지 못했어요' };
  }
}

async function openVault(pin) {
  const key = await deriveKey(pin, vault.kdf.salt, vault.kdf.iterations || PIN_ITERATIONS);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64.dec(vault.cipher.iv) }, key, b64.dec(vault.cipher.data)
  );
  const data = JSON.parse(new TextDecoder().decode(pt));
  if (data.school) SD = data.school;
  if (data.calendar && Array.isArray(data.calendar.events)) NAVER_CAL = data.calendar;
  return key;
}

function startApp() {
  if (appStarted) return;
  appStarted = true;
  bindEvents();
  renderAll();
  loadWeather();
  // 시간표·급식 카드는 시간이 흘러도 계속 맞게
  setInterval(() => { renderTodaySchedule(); renderTodayMeal(); tickClock(); }, 60000);
}

/* 볼트가 없는 판(예전 방식)에서만 쓰는 잠금 해제 */
async function unlockLocal(pin, onFail) {
  try {
    const key = await deriveKey(pin, pinLock.salt, pinLock.iterations || PIN_ITERATIONS);
    const payload = readJSON(STORAGE_KEY);
    let data = null;
    if (payload && payload.enc) data = await decryptJSON(key, payload);
    else if (payload) data = payload;
    stateKey = key;
    state = data ? mergeState(data) : createFirstState();
    const screen = document.getElementById('lockScreen');
    if (screen) screen.remove();
    document.body.style.overflow = '';
    startApp();
    if (!payload || !payload.enc) save();
    toast('잠금을 열었어요');
  } catch (e) {
    if (onFail) onFail();
  }
}

/* 볼트 PIN으로 열기: 자료를 풀고, 이 기기에 이미 쌓인 기록과 이어 붙입니다. */
async function unlockApp(pin, onFail) {
  let key;
  try {
    key = await openVault(pin);
  } catch (e) {
    if (onFail) onFail();
    return;
  }

  const savedLock = readJSON(PIN_LOCK_KEY);
  const payload = readJSON(STORAGE_KEY);
  let local = null;
  if (payload && payload.enc) {
    try {
      local = await decryptJSON(key, payload);
    } catch (e) {
      // 예전에 이 기기에서 따로 정한 PIN이 있으면 그 키로도 열어 봅니다.
      if (savedLock && savedLock.salt) {
        try {
          local = await decryptJSON(await deriveKey(pin, savedLock.salt, savedLock.iterations || PIN_ITERATIONS), payload);
        } catch (e2) { local = null; }
      }
      if (!local) {
        // 풀지 못한 기록도 지우지 않고 따로 남겨 둡니다.
        try { localStorage.setItem(STORAGE_KEY + '-locked-backup', JSON.stringify(payload)); } catch (e3) { }
      }
    }
  } else if (payload && typeof payload === 'object') {
    local = payload;
  }

  state = local ? mergeState(local) : createFirstState();
  // 볼트에 들어 있는 아이 이름으로 기본 이름(첫째/둘째)을 채웁니다. 직접 고친 이름은 그대로 둡니다.
  if (SD && SD.timetable && SD.timetable.children) {
    ['child1', 'child2'].forEach(id => {
      const meta = SD.timetable.children[id];
      const m = state.members.find(x => x.id === id);
      if (m && meta && meta.label && (m.name === '첫째' || m.name === '둘째' || !m.name)) m.name = meta.label;
    });
  }
  // 이 기기의 기록도 같은 PIN 열쇠로 저장되도록 맞춰 둡니다(기존 암호화 설정과 자연스럽게 연동).
  pinLock = {
    v: 1, enabled: true,
    salt: vault.kdf.salt,
    iterations: vault.kdf.iterations || PIN_ITERATIONS,
    createdAt: (savedLock && savedLock.createdAt) || Date.now()
  };
  try { localStorage.setItem(PIN_LOCK_KEY, JSON.stringify(pinLock)); } catch (e) { }
  stateKey = key;

  const screen = document.getElementById('lockScreen');
  if (screen) screen.remove();
  document.body.style.overflow = '';
  startApp();
  save();
  toast('잠금을 열었어요');
}

function showLockScreen() {
  const el = document.createElement('div');
  el.className = 'lock';
  el.id = 'lockScreen';
  el.innerHTML = `
    <div class="lock-card">
      <div class="lock-icon">🏡</div>
      <h2>가족 대시보드</h2>
      <p>가족 PIN 4자리를 입력해 주세요</p>
      <div class="lock-dots" id="lockDots"><i></i><i></i><i></i><i></i></div>
      <div class="lock-keys" id="lockKeys">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join('')}
        <button type="button" class="ghost" data-k="clear">지우기</button>
        <button type="button" data-k="0">0</button>
        <button type="button" class="ghost" data-k="back" aria-label="한 자리 지우기">⌫</button>
      </div>
      <p class="lock-err" id="lockErr"></p>
      <p class="lock-foot">PIN을 잊으면 시간표·급식·일정을 열 수 없어요.<br>자료는 암호화된 볼트로만 보관돼요.</p>
    </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  let pin = '';
  let busy = false;
  const dots = el.querySelector('#lockDots');
  const err = el.querySelector('#lockErr');
  const paint = () => Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i < pin.length));
  const fail = () => {
    err.textContent = 'PIN이 맞지 않아요. 다시 입력해 주세요.';
    dots.classList.add('shake');
    setTimeout(() => dots.classList.remove('shake'), 420);
  };
  const press = async k => {
    if (busy) return;
    if (k === 'clear') { pin = ''; paint(); return; }
    if (k === 'back') { pin = pin.slice(0, -1); paint(); return; }
    if (pin.length >= 4) return;
    err.textContent = '';
    pin += k;
    paint();
    if (pin.length === 4) {
      busy = true;
      if (vault) await unlockApp(pin, fail);
      else await unlockLocal(pin, fail);
      busy = false;
      pin = '';
      paint();
    }
  };
  el.querySelector('#lockKeys').addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (b) press(b.dataset.k);
  });
  document.addEventListener('keydown', function onKey(e) {
    if (!document.getElementById('lockScreen')) { document.removeEventListener('keydown', onKey); return; }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); press('back'); }
  });
}

function showUnlockBlocked() {
  const el = document.createElement('div');
  el.className = 'lock';
  el.innerHTML = `<div class="lock-card">
    <div class="lock-icon">🔒</div>
    <h2>잠긴 대시보드</h2>
    <p>이 기록은 암호화되어 있어요.<br>보안 연결(https)이나 앱으로 열어야 PIN을 풀 수 있어요.</p>
    <p class="lock-foot">홈 화면에 추가한 앱으로 열거나, https 주소로 열어 주세요.</p>
  </div>`;
  document.body.appendChild(el);
}

function showLoadError(msg) {
  const el = document.createElement('div');
  el.className = 'lock';
  el.innerHTML = `<div class="lock-card">
    <div class="lock-icon">📡</div>
    <h2>자료를 불러오지 못했어요</h2>
    <p>암호화된 자료 파일을 읽지 못했습니다.<br>인터넷 연결을 확인하고 다시 열어 주세요.</p>
    <p class="lock-foot" id="loadErrDetail">${esc(msg || '')}</p>
    <div class="btn-row" style="justify-content:center;margin-top:12px">
      <button type="button" class="primary-btn" id="btnReload">다시 불러오기</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  const btn = el.querySelector('#btnReload');
  if (btn) btn.onclick = () => location.reload();
}

async function boot() {
  if (!HAS_WEBCRYPTO) { showUnlockBlocked(); return; }

  const got = await loadVaultFile();
  if (got.vault) {
    vault = got.vault;
    showLockScreen();
    return;
  }
  // 볼트 파일이 없는 판(예전 방식)이라면 기기에 저장된 잠금 설정을 따릅니다.
  if (got.status && got.status !== 404 && got.status !== 0) { showLoadError(got.error); return; }
  if (!got.status && got.error) { showLoadError(got.error); return; }

  pinLock = readJSON(PIN_LOCK_KEY);
  const payload = readJSON(STORAGE_KEY);

  if (pinLock && pinLock.enabled) {
    showLockScreen();
    return;
  }
  if (payload && payload.enc) {
    // 잠금 설정이 없는데 암호문만 남은 경우(설정만 지워진 경우)
    console.warn('암호화된 기록이 있지만 잠금 설정이 없어 열 수 없습니다.');
    state = createFirstState();
  } else {
    state = payload ? mergeState(payload) : createFirstState();
  }
  startApp();
}

boot();

