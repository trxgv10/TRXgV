/* script.js — frontend
 - local state in localStorage
 - miner timers + resume after refresh
 - VIP buy flow calls server endpoints
 - withdraw flow calls server endpoints
*/

const API_ROOT = ""; // LEAVE empty for same-host server. If server runs elsewhere set full URL e.g. https://your-server.onrender.com

// CONFIG
const TRX_RATE = 0.0006; // 1 TRX = 0.0006 USDT

// initial state
const defaultState = {
  trx: 20,
  usdt: 20 * TRX_RATE,
  teamCount: 0,
  vipLevel: 0,
  miners: {
    standard: {active:false, end:null, durationSec: 24*3600, rewardTRX:5},
    golden:   {active:false, end:null, durationSec: 15*24*3600, rewardTRX:1200},
    red:      {active:false, end:null, durationSec: 10*24*3600, rewardUSDT:10},
    free6:    {active:false, end:null, durationSec: 24*3600, rewardUSDT:6}
  },
  ref: null
};

function getState(){ try{ return JSON.parse(localStorage.getItem('trxg_state')) || defaultState; }catch(e){ return defaultState; } }
function setState(s){ localStorage.setItem('trxg_state', JSON.stringify(s)); }

let state = getState();
if(!state.ref){ state.ref = Math.random().toString(36).slice(2,9); setState(state); }
document.getElementById('refCode').value = state.ref;
document.getElementById('rateLabel').innerText = TRX_RATE.toString();

// render balances
function renderBalances(){
  document.getElementById('trxBalance').innerText = parseFloat(state.trx).toFixed(6);
  document.getElementById('vipBalance').innerText = state.vipLevel ? `${state.vipLevel} (active)` : 'N/A';
  document.getElementById('teamCount').innerText = state.teamCount;
}
renderBalances();

// timers
let timerIntervals = {};
function startTimerLoop(minerKey, elTimerId, elProgressId){
  if(timerIntervals[minerKey]) return;
  timerIntervals[minerKey] = setInterval(()=>{
    updateMinerUI(minerKey, elTimerId, elProgressId);
  },1000);
}

function updateMinerUI(minerKey, elTimerId, elProgressId){
  const m = state.miners[minerKey];
  const el = document.getElementById(elTimerId);
  const p = document.getElementById(elProgressId);
  if(!m.active || !m.end){ el.innerText = 'Not started'; p.style.width = '0%'; return; }
  const remaining = Math.max(0, Math.floor((m.end - Date.now())/1000));
  const total = m.durationSec;
  const pct = Math.max(0, Math.min(100, ((total - remaining)/total)*100));
  p.style.width = pct + '%';
  const d = Math.floor(remaining/86400); const h = Math.floor((remaining%86400)/3600); const mm = Math.floor((remaining%3600)/60); const s = remaining%60;
  el.innerText = `${d}d ${h}h ${mm}m ${s}s`;
  if(remaining <= 0){
    m.active = false;
    m.end = null;
    setState(state);
    el.innerText = 'Ready to claim';
    p.style.width = '100%';
  }
}

// start loops for all miners (so UI resumes)
startTimerLoop('standard','timer1','p1');
startTimerLoop('golden','timer2','p2');
startTimerLoop('red','timer3','p3');
startTimerLoop('free6','timer4','p4');

// init UI from state
Object.keys(state.miners).forEach(k=>{
  const m = state.miners[k];
  if(m.active && m.end){
    updateMinerUI(k, {standard:'timer1',golden:'timer2',red:'timer3',free6:'timer4'}[k],
                    {standard:'p1',golden:'p2',red:'p3',free6:'p4'}[k]);
  }
});

// buttons: start / collect
document.querySelectorAll('.miner .start').forEach(b=>{
  b.addEventListener('click',(ev)=>{
    const key = ev.target.dataset.miner;
    startMining(key);
  });
});
document.querySelectorAll('.miner .collect').forEach(b=>{
  b.addEventListener('click',(ev)=>{
    const key = ev.target.dataset.miner;
    collectMiner(key);
  });
});

// claim button
document.getElementById('claimBtn').addEventListener('click', async ()=>{
  const m = state.miners.free6;
  if(m.active && m.end && (m.end - Date.now()) <= 0){
    // if VIP required for withdraw — here simply add to state.trx or usdt
    if(state.vipLevel === 0){
      alert('Claimed but withdraw locked: only VIP can withdraw. (You still received 6 USDT credited to VIP balance)');
      // store locked amount
      state.locked = (state.locked || 0) + 6;
      setState(state);
      document.getElementById('locked').innerText = (state.locked||0).toFixed(6);
    } else {
      // VIP user receives immediately to usdt
      state.usdt = parseFloat((state.usdt + 6).toFixed(6));
      alert('✅ 6 USDT credited to your account (VIP withdraw enabled).');
    }
    // notify admin
    await serverNotify(`Claim: user ref ${state.ref} claimed 6 USDT (vip:${state.vipLevel}).`);
    setState(state);
    renderBalances();
  } else {
    alert('Free claim not ready or not started.');
  }
});

// start mining
function startMining(key){
  const m = state.miners[key];
  if(m.active) { alert('Already mining'); return; }
  m.active = true;
  m.end = Date.now() + (m.durationSec * 1000);
  setState(state);
  alert(`Started ${key} mining. Come back after cycle to collect.`);
  // notify
  serverNotify(`⛏️ Mining started: ${key} — Ref:${state.ref}`);
}

// collect reward
async function collectMiner(key){
  const m = state.miners[key];
  if(m.active && m.end && (m.end - Date.now()) > 0){ alert('Not ready yet'); return; }
  let msg = '';
  if(key === 'standard'){
    state.trx = parseFloat((state.trx + state.miners.standard.rewardTRX).toFixed(6));
    msg = `Collected ${state.miners.standard.rewardTRX} TRX`;
  } else if(key === 'golden'){
    state.trx = parseFloat((state.trx + state.miners.golden.rewardTRX).toFixed(6));
    msg = `Collected ${state.miners.golden.rewardTRX} TRX (golden)`;
  } else if(key === 'red'){
    state.usdt = parseFloat((state.usdt + state.miners.red.rewardUSDT).toFixed(6));
    msg = `Collected ${state.miners.red.rewardUSDT} USDT (red)`;
  }
  // mark inactive
  state.miners[key].active = false;
  state.miners[key].end = null;
  setState(state);
  alert(`✅ ${msg}`);
  await serverNotify(`Claim/Collect: ${msg} — Ref:${state.ref}`);
  renderBalances();
}

// convert TRX -> USDT
document.getElementById('convertBtn').addEventListener('click', convertTRX);
function convertTRX(){
  const v = parseFloat(document.getElementById('convertInput').value || 0);
  if(!v || v <= 0) { alert('Enter TRX'); return; }
  if(v > state.trx){ alert('Not enough TRX'); return; }
  const converted = v * TRX_RATE;
  state.trx = parseFloat((state.trx - v).toFixed(6));
  state.usdt = parseFloat((state.usdt + converted).toFixed(6));
  setState(state);
  alert(`Converted ${v} TRX → ${converted.toFixed(6)} USDT`);
  serverNotify(`🔁 Convert: Ref:${state.ref} TRX:${v} → USDT:${converted.toFixed(6)}`);
  renderBalances();
}

// withdraw
document.getElementById('withdrawSubmit').addEventListener('click', async ()=>{
  const uid = document.getElementById('withdrawUID').value.trim();
  const method = document.getElementById('withdrawMethod').value;
  const amount = parseFloat(document.getElementById('withdrawAmount').value||0);
  if(!uid){ alert('Enter receiver UID'); return; }
  if(isNaN(amount) || amount < 0.01){ alert('Enter valid amount (min 0.01)'); return; }
  if(amount > state.usdt){ alert('Not enough USDT'); return; }
  // if withdraw requires VIP except for super fast vip?
  if(state.vipLevel === 0){
    alert('Withdraw requires VIP membership');
    return;
  }
  state.usdt = parseFloat((state.usdt - amount).toFixed(6));
  setState(state);
  document.getElementById('withdrawMsg').innerText = `Withdraw submitted: ${amount.toFixed(6)} USDT → ${method} (${uid})`;
  await serverWithdraw({ref: state.ref, method, uid, amount});
  renderBalances();
});

// VIP buy
document.querySelectorAll('.buy-vip').forEach(b=>{
  b.addEventListener('click', async (ev)=>{
    const lvl = parseInt(ev.target.dataset.vip);
    await buyVIP(lvl);
  });
});

async function buyVIP(lvl){
  // simulate: ask for sender UID and memo
  const sender = prompt('Enter your exchange UID (sender)');
  if(!sender) return alert('UID required');
  const memo = prompt('Enter transaction memo/ID');
  if(!memo) return alert('Memo required');
  // send VIP request to server (admin)
  const fee = (lvl === 1) ? 1 : 10;
  await serverVIPBuy({ref: state.ref, level: lvl, sender, memo, fee});
  alert(`VIP${lvl} request submitted. Admin will activate within 24h (demo).`);
}

// fast withdraw
document.getElementById('fastWithdrawBtn').addEventListener('click', async ()=>{
  if(state.vipLevel === 0){ alert('Only VIP users can use fast withdraw'); return; }
  const uid = prompt('Enter receiver UID for fast withdraw (Binance recommended)');
  const amount = parseFloat(prompt('Enter amount USDT')||0);
  if(!uid || !amount || amount <= 0) return;
  await serverWithdraw({ref: state.ref, method:'binance', uid, amount, fast:true});
  alert('Fast withdraw requested.');
});

// fake invite
document.getElementById('fakeInvite').addEventListener('click', ()=>{
  state.teamCount = (state.teamCount||0) + 1;
  setState(state); renderBalances();
});

// copy ref
document.getElementById('copyRef').addEventListener('click', async ()=>{
  const rc = document.getElementById('refCode').value;
  try{ await navigator.clipboard.writeText(rc); alert('Referral code copied'); }catch(e){ alert('Copy failed — manually copy: ' + rc); }
});

// SERVER API helpers
async function serverNotify(text){
  try{
    if(!API_ROOT) return;
    await fetch(API_ROOT + '/api/notify', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
  }catch(e){ console.error('notify err',e); }
}
async function serverVIPBuy(payload){
  try{
    if(!API_ROOT) return;
    await fetch(API_ROOT + '/api/vip-buy', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  }catch(e){ console.error('vip err',e); }
}
async function serverWithdraw(payload){
  try{
    if(!API_ROOT) return;
    await fetch(API_ROOT + '/api/withdraw', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  }catch(e){ console.error('withdraw err',e); }
}

// expose for debugging
window._state = state;
