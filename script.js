// Miner Timers
const startTimers = () => {
  const timers = [
    { id: "timer1", secs: 3600 },
    { id: "timer2", secs: 15 * 86400 },
    { id: "timer3", secs: 10 * 86400 },
    { id: "timer4", secs: 86400 },
  ];
  timers.forEach(t => {
    const el = document.getElementById(t.id);
    let s = t.secs;
    setInterval(() => {
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      el.textContent = `${d}d ${h}h ${m}m ${sec}s`;
      if (s > 0) s--;
    }, 1000);
  });
};
startTimers();

// VIP system
let vipLevel = 0;

function buyVIP(lvl) {
  vipLevel = lvl;
  alert(`✅ You are now VIP ${lvl}!`);
}

function fastWithdraw() {
  if (vipLevel === 0) {
    alert("⚠️ Only VIP users can use fast withdraw!");
  } else {
    alert("💸 Super Fast VIP Withdraw Requested!");
  }
}

function convertTRX() {
  let trx = parseFloat(document.getElementById("trxInput").value || 0);
  alert(`${trx} TRX ≈ ${(trx * 0.0006).toFixed(4)} USDT`);
}

document.getElementById("withdrawBtn").addEventListener("click", () => {
  if (vipLevel === 0) {
    alert("⚠️ Only VIP users can withdraw!");
  } else {
    alert("✅ Withdraw request submitted successfully!");
  }
});

document.getElementById("claimBtn").addEventListener("click", () => {
  if (vipLevel === 0) {
    alert("❌ You must be VIP to withdraw this reward!");
  } else {
    alert("✅ 6 USDT claimed successfully!");
  }
});
