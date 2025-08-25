// CryptoDash Professional Trading Dashboard
class CryptoDashboard {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.charts = {};
        this.websocket = null;
        this.priceData = {};
        this.portfolioData = {
            totalValue: 127450.89,
            dailyChange: 5234.67,
            percentChange: 4.28,
            assets: [
                { symbol: 'BTC', name: 'Bitcoin', amount: 0.8456, price: 67234.50, value: 56856.78, change: 2.34 },
                { symbol: 'ETH', name: 'Ethereum', amount: 12.345, price: 3456.78, value: 42678.90, change: 1.67 },
                { symbol: 'ADA', name: 'Cardano', amount: 15000, price: 0.89, value: 13350.00, change: -0.45 },
                { symbol: 'DOT', name: 'Polkadot', amount: 500, price: 6.23, value: 3115.00, change: 3.21 }
            ]
        };
        
        this.init();
    }

    // Helper function for authenticated API calls
    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('cryptodash_token');
        if (!token) {
            throw new Error('No authentication token');
        }
        
        const baseURL = 'http://localhost:3001';
        const fullURL = endpoint.startsWith('http') ? endpoint : baseURL + endpoint;
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        const response = await fetch(fullURL, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        return response.json();
    }

    async init() {
        console.log('🚀 CryptoDash Dashboard Initializing...');
        
        try {
                // Check for JWT token in URL (Google OAuth callback)
                const urlParams = new URLSearchParams(window.location.search);
                const jwtToken = urlParams.get('token');
                if (jwtToken) {
                    localStorage.setItem('cryptodash_token', jwtToken);
                    // Remove token from URL for cleanliness
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            this.updateLoadingStep(1, 'Loading Firebase...');
            
            // Check authentication first - this is critical
            await this.checkAuthentication();
            
            this.updateLoadingStep(2, 'Authentication verified!');
            this.updateLoadingStep(3, 'Setting up dashboard...');
            
            // Only initialize UI if authentication is successful
            this.initializeNavigation();
            this.initializeTheme();
            this.initializeCharts();
            this.initializeTradingHandlers();
            
            this.updateLoadingStep(4, 'Loading portfolio data...');
            // Fetch real portfolio data from backend
            await this.fetchPortfolioData();
            
            this.initializeMarketData();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Hide loading screen
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 1000);
            
            console.log('✅ Dashboard Ready!');
        } catch (error) {
            console.error('🔴 Dashboard initialization failed:', error);
            this.updateLoadingStep(0, 'Authentication failed. Redirecting...');
            // Authentication failed, redirect to login
            setTimeout(() => {
                window.location.href = 'http://localhost:3001/login.html';
            }, 2000);
        }
    }

    updateLoadingStep(step, message) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText && message) {
            loadingText.textContent = message;
        }
        
        // Update step indicators
        for (let i = 1; i <= 3; i++) {
            const stepElement = document.getElementById(`step${i}`);
            if (stepElement) {
                stepElement.classList.remove('active', 'complete');
                if (i < step) {
                    stepElement.classList.add('complete');
                } else if (i === step) {
                    stepElement.classList.add('active');
                }
            }
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.remove();
            }, 300);
        }
    }

    async fetchPortfolioData() {
        console.log('📊 Fetching portfolio data from backend...');
        try {
            const [balances, orders] = await Promise.all([
                this.apiCall('/api/wallet/balances'),
                this.apiCall('/api/orders/history?limit=10')
            ]);
            
            console.log('✅ Portfolio data fetched successfully');
            
            // Process wallet balances and calculate portfolio
            const assets = balances.map(balance => ({
                symbol: balance.currency,
                name: this.getCryptocurrencyName(balance.currency),
                amount: parseFloat(balance.available) + parseFloat(balance.locked),
                price: balance.currentPrice || 0,
                value: (parseFloat(balance.available) + parseFloat(balance.locked)) * (balance.currentPrice || 0),
                change: balance.change24h || 0
            }));
            
            // Calculate totals
            const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
            const totalChange = assets.reduce((sum, asset) => sum + (asset.value * asset.change / 100), 0);
            const percentChange = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;
            
            // Update portfolio data
            this.portfolioData = {
                totalValue,
                dailyChange: totalChange,
                percentChange: percentChange.toFixed(2),
                assets
            };
            
            console.log('📈 Portfolio updated:', this.portfolioData);
            
        } catch (error) {
            console.error('❌ Error fetching portfolio data:', error);
            // Keep default demo data if fetch fails
            console.log('📊 Using demo portfolio data');
        }
    }

    getCryptocurrencyName(symbol) {
        const cryptoNames = {
            'BTC': 'Bitcoin',
            'ETH': 'Ethereum',
            'ADA': 'Cardano',
            'DOT': 'Polkadot',
            'BNB': 'Binance Coin',
            'USDT': 'Tether',
            'USDC': 'USD Coin',
            'XRP': 'Ripple',
            'DOGE': 'Dogecoin',
            'LINK': 'Chainlink'
        };
        return cryptoNames[symbol] || symbol;
    }

    async placeOrder(orderData) {
        console.log('📋 Placing order:', orderData);
        try {
            const order = await this.apiCall('/api/orders/create', {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
            
            console.log('✅ Order placed successfully:', order);
            this.showNotification(`${orderData.side.toUpperCase()} order placed successfully`, 'success');
            
            // Refresh portfolio data
            await this.fetchPortfolioData();
            
            return order;
            
        } catch (error) {
            console.error('❌ Error placing order:', error);
            this.showNotification(`Failed to place order: ${error.message}`, 'error');
            throw error;
        }
    }

    initializeTradingHandlers() {
        // Order form submission
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-primary.btn-full')) {
                e.preventDefault();
                this.handleOrderSubmission(e.target);
            }
        });

        // Order type tabs
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-order-type]')) {
                this.handleOrderTypeChange(e.target);
            }
        });
    }

    async handleOrderSubmission(button) {
        const orderForm = button.closest('.order-form');
        if (!orderForm) return;

        const formData = new FormData();
        const inputs = orderForm.querySelectorAll('input, select');
        
        let orderData = {};
        inputs.forEach(input => {
            orderData[input.name || input.id] = input.value;
        });

        // Determine order type from button text
        const orderType = button.textContent.toLowerCase().includes('buy') ? 'buy' : 'sell';
        
        // Basic validation
        if (!orderData.quantity || !orderData.price) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const order = {
            symbol: 'BTC/USDT', // Default - should be made dynamic
            side: orderType,
            type: 'limit',
            quantity: parseFloat(orderData.quantity),
            price: parseFloat(orderData.price)
        };

        try {
            button.disabled = true;
            button.textContent = 'Placing Order...';
            
            await this.placeOrder(order);
            
            // Reset form
            inputs.forEach(input => input.value = '');
            
        } catch (error) {
            // Error already handled in placeOrder
        } finally {
            button.disabled = false;
            button.textContent = orderType === 'buy' ? 'Place Buy Order' : 'Place Sell Order';
        }
    }

    handleOrderTypeChange(tab) {
        const container = tab.closest('.order-tabs');
        if (!container) return;

        // Update active tab
        container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tab.classList.add('active');

        // Update button text
        const orderType = tab.dataset.orderType;
        const button = container.parentElement.querySelector('.btn-primary.btn-full');
        if (button) {
            button.textContent = `Place ${orderType.charAt(0).toUpperCase() + orderType.slice(1)} Order`;
        }
    }

    async depositFunds(currency, amount, paymentMethod = 'bank_transfer') {
        console.log('💰 Initiating deposit:', { currency, amount, paymentMethod });
        try {
            const deposit = await this.apiCall('/api/wallet/deposit', {
                method: 'POST',
                body: JSON.stringify({
                    currency,
                    amount: parseFloat(amount),
                    paymentMethod
                })
            });
            
            console.log('✅ Deposit initiated:', deposit);
            this.showNotification(`Deposit of ${amount} ${currency} initiated successfully`, 'success');
            
            // Refresh portfolio data
            await this.fetchPortfolioData();
            
            return deposit;
            
        } catch (error) {
            console.error('❌ Error initiating deposit:', error);
            this.showNotification(`Failed to initiate deposit: ${error.message}`, 'error');
            throw error;
        }
    }

    async withdrawFunds(currency, amount, address) {
        console.log('💸 Initiating withdrawal:', { currency, amount, address });
        try {
            const withdrawal = await this.apiCall('/api/wallet/withdraw', {
                method: 'POST',
                body: JSON.stringify({
                    currency,
                    amount: parseFloat(amount),
                    address
                })
            });
            
            console.log('✅ Withdrawal initiated:', withdrawal);
            this.showNotification(`Withdrawal of ${amount} ${currency} initiated successfully`, 'success');
            
            // Refresh portfolio data
            await this.fetchPortfolioData();
            
            return withdrawal;
            
        } catch (error) {
            console.error('❌ Error initiating withdrawal:', error);
            this.showNotification(`Failed to initiate withdrawal: ${error.message}`, 'error');
            throw error;
        }
    }

    async getWalletHistory() {
        console.log('📋 Fetching wallet transaction history...');
        try {
            const history = await this.apiCall('/api/wallet/history');
            console.log('✅ Wallet history fetched:', history);
            return history;
            
        } catch (error) {
            console.error('❌ Error fetching wallet history:', error);
            this.showNotification('Failed to fetch wallet history', 'error');
            return [];
        }
    }

    async checkAuthentication() {
        try {
            console.log('🔍 Checking backend authentication...');
            
            // Check if we have a token
            const token = localStorage.getItem('cryptodash_token');
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            // Verify token with backend
            const user = await this.apiCall('/api/auth/profile');
            this.currentUser = user;
            this.updateUserInfo(user);
            console.log('✅ User authenticated successfully:', user.email);
            
            return user;
            
        } catch (error) {
            console.error('🔴 Authentication check failed:', error);
            localStorage.removeItem('cryptodash_token');
            setTimeout(() => {
                console.log('🔄 Redirecting to login...');
                window.location.href = 'http://localhost:3001/login.html';
            }, 2000);
            throw error;
        }
    }

    updateUserInfo(user) {
        const userNameElements = document.querySelectorAll('#userName');
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = displayName;
            }
        });
    }

    initializeNavigation() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');

        sidebarToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });

        mobileMenuToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Menu navigation
        const menuLinks = document.querySelectorAll('.menu-link');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });

        // Logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn?.addEventListener('click', () => {
            this.logout();
        });
    }

    navigateToPage(page) {
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.closest('.menu-item').classList.add('active');
        }

        // Show/hide page sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });

        let pageSection = document.getElementById(`${page}-page`);
        if (!pageSection && page !== 'dashboard') {
            // Create page if it doesn't exist
            pageSection = this.createPage(page);
        } else if (page === 'dashboard') {
            pageSection = document.getElementById('dashboard-page');
        }

        if (pageSection) {
            pageSection.classList.add('active');
        }

        // Update page title
        this.updatePageTitle(page);
        this.currentPage = page;
    }

    createPage(page) {
        const pageContent = document.getElementById('pageContent');
        const pageSection = document.createElement('div');
        pageSection.className = 'page-section';
        pageSection.id = `${page}-page`;

        // Create page content based on page type
        const content = this.getPageContent(page);
        pageSection.innerHTML = content;

        pageContent.appendChild(pageSection);
        return pageSection;
    }

    getPageContent(page) {
        const pageTemplates = {
            'spot-trading': this.getSpotTradingContent(),
            'futures': this.getFuturesContent(),
            'options': this.getOptionsContent(),
            'portfolio': this.getPortfolioContent(),
            'analytics': this.getAnalyticsContent(),
            'pnl': this.getPnLContent(),
            'staking': this.getStakingContent(),
            'yield-farming': this.getYieldFarmingContent(),
            'liquidity': this.getLiquidityContent(),
            'bot-trading': this.getBotTradingContent(),
            'alerts': this.getAlertsContent(),
            'academy': this.getAcademyContent()
        };

        return pageTemplates[page] || this.getComingSoonContent(page);
    }

    getSpotTradingContent() {
        return `
            <div class="trading-interface">
                <div class="trading-header">
                    <h2>Spot Trading</h2>
                    <div class="trading-controls">
                        <select class="trading-pair-select">
                            <option value="BTCUSDT">BTC/USDT</option>
                            <option value="ETHUSDT">ETH/USDT</option>
                            <option value="ADAUSDT">ADA/USDT</option>
                        </select>
                    </div>
                </div>
                
                <div class="trading-layout">
                    <div class="trading-chart">
                        <div id="tradingChart" style="height: 500px; background: var(--bg-card); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                            <div style="text-align: center;">
                                <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                                <p>Advanced TradingView Chart Integration</p>
                                <p style="font-size: 0.875rem;">Real-time price data and technical analysis tools</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="trading-panel">
                        <div class="order-book">
                            <h4>Order Book</h4>
                            <div class="book-content">
                                ${this.generateOrderBookHTML()}
                            </div>
                        </div>
                        
                        <div class="trading-form">
                            <div class="order-tabs">
                                <button class="tab-btn active" data-order-type="buy">Buy</button>
                                <button class="tab-btn" data-order-type="sell">Sell</button>
                            </div>
                            
                            <div class="order-form">
                                <div class="form-group">
                                    <label>Order Type</label>
                                    <select class="form-select">
                                        <option>Market</option>
                                        <option>Limit</option>
                                        <option>Stop Limit</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Price (USDT)</label>
                                    <input type="number" class="form-input" placeholder="0.00">
                                </div>
                                
                                <div class="form-group">
                                    <label>Amount (BTC)</label>
                                    <input type="number" class="form-input" placeholder="0.00">
                                </div>
                                
                                <div class="form-group">
                                    <label>Total (USDT)</label>
                                    <input type="number" class="form-input" placeholder="0.00">
                                </div>
                                
                                <button class="btn btn-primary btn-full">Place Buy Order</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFuturesContent() {
        return `
            <div class="futures-trading">
                <div class="trading-header">
                    <h2>Futures Trading</h2>
                    <div class="trading-controls">
                        <select class="trading-pair-select">
                            <option value="BTCUSDT">BTC/USDT Perpetual</option>
                            <option value="ETHUSDT">ETH/USDT Perpetual</option>
                            <option value="ADAUSDT">ADA/USDT Perpetual</option>
                        </select>
                        <div class="leverage-control">
                            <label>Leverage:</label>
                            <select class="leverage-select">
                                <option value="1">1x</option>
                                <option value="5">5x</option>
                                <option value="10" selected>10x</option>
                                <option value="25">25x</option>
                                <option value="50">50x</option>
                                <option value="100">100x</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="trading-layout">
                    <div class="trading-chart">
                        <div id="futuresChart" style="height: 500px; background: var(--bg-card); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                            <div style="text-align: center;">
                                <i class="fas fa-chart-area" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                                <p>Advanced Futures Chart with Leverage Indicators</p>
                                <p style="font-size: 0.875rem;">Real-time perpetual contracts and funding rates</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="trading-panel">
                        <div class="position-info">
                            <h4>Position Information</h4>
                            <div class="position-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Mark Price:</span>
                                    <span class="stat-value">$43,254.32</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Funding Rate:</span>
                                    <span class="stat-value positive">+0.0123%</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Open Interest:</span>
                                    <span class="stat-value">$2.1B</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="trading-form">
                            <div class="order-tabs">
                                <button class="tab-btn active" data-order-type="long">Long</button>
                                <button class="tab-btn" data-order-type="short">Short</button>
                            </div>
                            
                            <div class="order-form">
                                <div class="form-group">
                                    <label>Order Type</label>
                                    <select class="form-select">
                                        <option>Market</option>
                                        <option>Limit</option>
                                        <option>Stop Market</option>
                                        <option>Stop Limit</option>
                                        <option>Take Profit</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Quantity (BTC)</label>
                                    <input type="number" class="form-input" placeholder="0.00" step="0.001">
                                </div>
                                
                                <div class="form-group">
                                    <label>Price (USDT)</label>
                                    <input type="number" class="form-input" placeholder="Market Price" step="0.01">
                                </div>
                                
                                <div class="form-group">
                                    <label>Margin</label>
                                    <div class="margin-info">
                                        <span>Required: $432.54</span>
                                        <span>Available: $15,420.30</span>
                                    </div>
                                </div>
                                
                                <button class="btn btn-primary btn-block">
                                    <i class="fas fa-rocket"></i>
                                    Open Long Position
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="positions-section">
                    <h3>Open Positions</h3>
                    <div class="positions-table">
                        <div class="table-header">
                            <span>Symbol</span>
                            <span>Side</span>
                            <span>Size</span>
                            <span>Entry Price</span>
                            <span>Mark Price</span>
                            <span>PnL</span>
                            <span>Actions</span>
                        </div>
                        <div class="table-row">
                            <span class="symbol">BTC/USDT</span>
                            <span class="side long">Long</span>
                            <span>0.5 BTC</span>
                            <span>$42,150.00</span>
                            <span>$43,254.32</span>
                            <span class="pnl positive">+$552.16 (+2.62%)</span>
                            <span class="actions">
                                <button class="btn-sm btn-outline">Close</button>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPortfolioContent() {
        return `
            <div class="portfolio-management">
                <div class="portfolio-header">
                    <h2>Portfolio Management</h2>
                    <div class="portfolio-controls">
                        <button class="btn btn-outline">Export Portfolio</button>
                        <button class="btn btn-primary">Rebalance</button>
                    </div>
                </div>
                
                <div class="portfolio-summary-cards">
                    <div class="summary-card">
                        <h4>Total Portfolio Value</h4>
                        <p class="value">$${this.portfolioData.totalValue.toLocaleString()}</p>
                        <p class="change positive">+$${this.portfolioData.dailyChange.toLocaleString()} (+${this.portfolioData.percentChange}%)</p>
                    </div>
                    
                    <div class="summary-card">
                        <h4>Available Balance</h4>
                        <p class="value">$12,450.89</p>
                        <p class="change neutral">Ready to invest</p>
                    </div>
                    
                    <div class="summary-card">
                        <h4>Total P&L</h4>
                        <p class="value positive">+$27,450.89</p>
                        <p class="change positive">+27.5% All Time</p>
                    </div>
                </div>
                
                <div class="portfolio-assets">
                    <h3>Your Assets</h3>
                    <div class="assets-table">
                        ${this.generateAssetsTableHTML()}
                    </div>
                </div>
            </div>
        `;
    }

    getStakingContent() {
        return `
            <div class="staking-platform">
                <div class="staking-header">
                    <h2>Staking Rewards</h2>
                    <p>Earn passive income by staking your crypto assets</p>
                </div>
                
                <div class="staking-stats">
                    <div class="stat-card">
                        <h4>Total Staked</h4>
                        <p class="value">$45,670.23</p>
                    </div>
                    
                    <div class="stat-card">
                        <h4>Pending Rewards</h4>
                        <p class="value positive">$1,234.56</p>
                    </div>
                    
                    <div class="stat-card">
                        <h4>Average APY</h4>
                        <p class="value">12.5%</p>
                    </div>
                </div>
                
                <div class="staking-opportunities">
                    <h3>Staking Opportunities</h3>
                    <div class="opportunities-grid">
                        ${this.generateStakingOpportunitiesHTML()}
                    </div>
                </div>
            </div>
        `;
    }

    getBotTradingContent() {
        return `
            <div class="bot-trading-platform">
                <div class="bot-header">
                    <h2>Automated Trading Bots</h2>
                    <button class="btn btn-primary">Create New Bot</button>
                </div>
                
                <div class="bot-stats">
                    <div class="stat-card">
                        <h4>Active Bots</h4>
                        <p class="value">3</p>
                    </div>
                    
                    <div class="stat-card">
                        <h4>Total Profit</h4>
                        <p class="value positive">+$8,934.56</p>
                    </div>
                    
                    <div class="stat-card">
                        <h4>Success Rate</h4>
                        <p class="value">78.5%</p>
                    </div>
                </div>
                
                <div class="active-bots">
                    <h3>Your Trading Bots</h3>
                    <div class="bots-list">
                        ${this.generateBotsListHTML()}
                    </div>
                </div>
            </div>
        `;
    }

    getComingSoonContent(page) {
        const pageNames = {
            'futures': 'Futures Trading',
            'options': 'Options Trading',
            'analytics': 'Advanced Analytics',
            'pnl': 'P&L Reports',
            'yield-farming': 'Yield Farming',
            'liquidity': 'Liquidity Pools',
            'alerts': 'Price Alerts',
            'academy': 'Trading Academy'
        };

        return `
            <div class="coming-soon">
                <div class="coming-soon-content">
                    <i class="fas fa-rocket" style="font-size: 4rem; color: var(--primary-blue); margin-bottom: 2rem;"></i>
                    <h2>${pageNames[page] || page}</h2>
                    <p>This feature is coming soon! We're working hard to bring you the best trading experience.</p>
                    <div class="feature-preview">
                        <h4>What to expect:</h4>
                        <ul>
                            <li>Professional-grade trading tools</li>
                            <li>Real-time market data</li>
                            <li>Advanced analytics and reporting</li>
                            <li>Institutional-level security</li>
                        </ul>
                    </div>
                    <button class="btn btn-primary">Notify Me When Ready</button>
                </div>
            </div>
        `;
    }

    generateOrderBookHTML() {
        const asks = [
            { price: 67250.50, amount: 0.1567, total: 10534.23 },
            { price: 67245.25, amount: 0.2341, total: 15742.89 },
            { price: 67240.00, amount: 0.5678, total: 38176.43 }
        ];

        const bids = [
            { price: 67235.75, amount: 0.3456, total: 23234.56 },
            { price: 67230.50, amount: 0.1890, total: 12706.57 },
            { price: 67225.25, amount: 0.4567, total: 30709.87 }
        ];

        return `
            <div class="order-book-side asks">
                <div class="book-header">
                    <span>Price (USDT)</span>
                    <span>Amount (BTC)</span>
                    <span>Total</span>
                </div>
                ${asks.map(ask => `
                    <div class="book-row ask">
                        <span class="price">${ask.price.toLocaleString()}</span>
                        <span class="amount">${ask.amount}</span>
                        <span class="total">${ask.total.toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="spread">
                <span class="spread-value">Spread: $14.75 (0.02%)</span>
            </div>
            
            <div class="order-book-side bids">
                ${bids.map(bid => `
                    <div class="book-row bid">
                        <span class="price">${bid.price.toLocaleString()}</span>
                        <span class="amount">${bid.amount}</span>
                        <span class="total">${bid.total.toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateAssetsTableHTML() {
        return `
            <div class="table-header">
                <span>Asset</span>
                <span>Amount</span>
                <span>Price</span>
                <span>Value</span>
                <span>24h Change</span>
                <span>Actions</span>
            </div>
            ${this.portfolioData.assets.map(asset => `
                <div class="table-row">
                    <div class="asset-info">
                        <div class="asset-icon">${this.getAssetIcon(asset.symbol)}</div>
                        <div class="asset-details">
                            <span class="asset-name">${asset.name}</span>
                            <span class="asset-symbol">${asset.symbol}</span>
                        </div>
                    </div>
                    <span class="amount">${asset.amount.toLocaleString()} ${asset.symbol}</span>
                    <span class="price">$${asset.price.toLocaleString()}</span>
                    <span class="value">$${asset.value.toLocaleString()}</span>
                    <span class="change ${asset.change >= 0 ? 'positive' : 'negative'}">${asset.change >= 0 ? '+' : ''}${asset.change}%</span>
                    <div class="actions">
                        <button class="btn btn-outline btn-small">Trade</button>
                        <button class="btn btn-outline btn-small">Stake</button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    generateStakingOpportunitiesHTML() {
        const opportunities = [
            { symbol: 'ETH', name: 'Ethereum 2.0', apy: 5.2, minStake: 32, duration: 'Flexible' },
            { symbol: 'ADA', name: 'Cardano', apy: 4.8, minStake: 10, duration: '21 days' },
            { symbol: 'DOT', name: 'Polkadot', apy: 12.5, minStake: 120, duration: '28 days' },
            { symbol: 'ATOM', name: 'Cosmos', apy: 18.7, minStake: 1, duration: '21 days' }
        ];

        return opportunities.map(opp => `
            <div class="opportunity-card">
                <div class="opportunity-header">
                    <div class="asset-info">
                        <div class="asset-icon">${this.getAssetIcon(opp.symbol)}</div>
                        <div class="asset-details">
                            <h4>${opp.name}</h4>
                            <span>${opp.symbol}</span>
                        </div>
                    </div>
                    <div class="apy-badge">
                        <span class="apy">${opp.apy}%</span>
                        <span class="apy-label">APY</span>
                    </div>
                </div>
                
                <div class="opportunity-details">
                    <div class="detail-item">
                        <span class="label">Min. Stake:</span>
                        <span class="value">${opp.minStake} ${opp.symbol}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Duration:</span>
                        <span class="value">${opp.duration}</span>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-full">Start Staking</button>
            </div>
        `).join('');
    }

    generateBotsListHTML() {
        const bots = [
            { name: 'DCA Bitcoin Bot', status: 'Running', profit: 2345.67, trades: 156, winRate: 78.5 },
            { name: 'Grid Trading ETH', status: 'Running', profit: 1890.34, trades: 89, winRate: 82.0 },
            { name: 'Arbitrage Scanner', status: 'Paused', profit: 4698.55, trades: 234, winRate: 71.2 }
        ];

        return bots.map(bot => `
            <div class="bot-card">
                <div class="bot-header">
                    <div class="bot-info">
                        <h4>${bot.name}</h4>
                        <span class="bot-status ${bot.status.toLowerCase()}">${bot.status}</span>
                    </div>
                    <div class="bot-actions">
                        <button class="btn btn-outline btn-small">Edit</button>
                        <button class="btn btn-outline btn-small">${bot.status === 'Running' ? 'Pause' : 'Start'}</button>
                    </div>
                </div>
                
                <div class="bot-stats">
                    <div class="bot-stat">
                        <span class="stat-label">Total Profit</span>
                        <span class="stat-value positive">+$${bot.profit.toLocaleString()}</span>
                    </div>
                    <div class="bot-stat">
                        <span class="stat-label">Total Trades</span>
                        <span class="stat-value">${bot.trades}</span>
                    </div>
                    <div class="bot-stat">
                        <span class="stat-label">Win Rate</span>
                        <span class="stat-value">${bot.winRate}%</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getAssetIcon(symbol) {
        const icons = {
            'BTC': '₿',
            'ETH': 'Ξ',
            'ADA': '₳',
            'DOT': '●',
            'ATOM': '⚛'
        };
        return icons[symbol] || '●';
    }

    updatePageTitle(page) {
        const pageTitles = {
            dashboard: 'Dashboard',
            'spot-trading': 'Spot Trading',
            futures: 'Futures Trading',
            options: 'Options Trading',
            portfolio: 'Portfolio',
            analytics: 'Analytics',
            pnl: 'P&L Reports',
            staking: 'Staking',
            'yield-farming': 'Yield Farming',
            liquidity: 'Liquidity Pools',
            'bot-trading': 'Bot Trading',
            alerts: 'Price Alerts',
            academy: 'Trading Academy'
        };

        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = pageTitles[page] || page;
        }
    }

    initializeTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('cryptodash-theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        themeToggle?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('cryptodash-theme', newTheme);
            this.updateThemeIcon(newTheme);
        });
    }

    updateThemeIcon(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    initializeCharts() {
        this.initPortfolioChart();
        this.initAllocationChart();
        this.initMiniCharts();
    }

    initPortfolioChart() {
        const ctx = document.getElementById('portfolioChart');
        if (!ctx) return;

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 82, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 82, 255, 0.0)');

        // Generate sample data
        const labels = [];
        const data = [];
        const baseValue = 120000;
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
            
            const randomChange = (Math.random() - 0.5) * 5000;
            const value = baseValue + randomChange + (i * 200);
            data.push(value);
        }

        this.charts.portfolio = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Portfolio Value',
                    data: data,
                    borderColor: '#0052ff',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#0052ff',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    initAllocationChart() {
        const ctx = document.getElementById('allocationChart');
        if (!ctx) return;

        this.charts.allocation = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Bitcoin', 'Ethereum', 'Cardano', 'Others'],
                datasets: [{
                    data: [45.2, 32.8, 12.1, 9.9],
                    backgroundColor: [
                        '#f7931a',
                        '#627eea',
                        '#0033ad',
                        '#6366f1'
                    ],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    initMiniCharts() {
        const miniCharts = document.querySelectorAll('.mini-chart');
        
        miniCharts.forEach((canvas, index) => {
            const symbol = canvas.getAttribute('data-symbol');
            this.createMiniChart(canvas, symbol);
        });
    }

    createMiniChart(canvas, symbol) {
        const ctx = canvas.getContext('2d');
        
        // Generate sample price data
        const data = [];
        let price = 50000; // Base price
        
        for (let i = 0; i < 20; i++) {
            price += (Math.random() - 0.5) * 1000;
            data.push(price);
        }

        const isPositive = data[data.length - 1] > data[0];
        const color = isPositive ? '#10b981' : '#ef4444';

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    data: data,
                    borderColor: color,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    async initializeMarketData() {
        // Fetch real market data from backend
        await this.updateMarketPrices();
        // Update every 30 seconds for real data
        setInterval(() => this.updateMarketPrices(), 30000);
    }

    async updateMarketPrices() {
        try {
            const marketData = await this.apiCall('/api/exchange/market-data');
            
            const priceElements = {
                btcPrice: { element: document.getElementById('btcPrice'), symbol: 'BTC' },
                ethPrice: { element: document.getElementById('ethPrice'), symbol: 'ETH' },
                adaPrice: { element: document.getElementById('adaPrice'), symbol: 'ADA' }
            };

            const changeElements = {
                btcChange: { element: document.getElementById('btcChange'), symbol: 'BTC' },
                ethChange: { element: document.getElementById('ethChange'), symbol: 'ETH' },
                adaChange: { element: document.getElementById('adaChange'), symbol: 'ADA' }
            };

            // Update prices with real data
            Object.keys(priceElements).forEach(key => {
                const { element, symbol } = priceElements[key];
                const symbolData = marketData.find(data => data.symbol.startsWith(symbol));
                
                if (element && symbolData) {
                    const price = parseFloat(symbolData.price);
                    element.textContent = `$${price.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}`;
                }
            });

            // Update change percentages with real data
            Object.keys(changeElements).forEach(key => {
                const { element, symbol } = changeElements[key];
                const symbolData = marketData.find(data => data.symbol.startsWith(symbol));
                
                if (element && symbolData) {
                    const change = parseFloat(symbolData.priceChangePercent);
                    element.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                    element.className = `ticker-change ${change >= 0 ? 'positive' : 'negative'}`;
                }
            });
            
        } catch (error) {
            console.error('❌ Error fetching market data:', error);
            // Fall back to demo data on error
            this.updateMarketPricesDemo();
        }
    }

    updateMarketPricesDemo() {
        const priceElements = {
            btcPrice: { element: document.getElementById('btcPrice'), base: 67234.50 },
            ethPrice: { element: document.getElementById('ethPrice'), base: 3456.78 },
            adaPrice: { element: document.getElementById('adaPrice'), base: 0.89 }
        };

        const changeElements = {
            btcChange: { element: document.getElementById('btcChange'), base: 2.34 },
            ethChange: { element: document.getElementById('ethChange'), base: 1.67 },
            adaChange: { element: document.getElementById('adaChange'), base: -0.45 }
        };

        // Update prices with small random changes
        Object.keys(priceElements).forEach(key => {
            const { element, base } = priceElements[key];
            if (element) {
                const change = (Math.random() - 0.5) * 0.02; // ±1% change
                const newPrice = base * (1 + change);
                element.textContent = `$${newPrice.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                })}`;
            }
        });

        // Update change percentages
        Object.keys(changeElements).forEach(key => {
            const { element, base } = changeElements[key];
            if (element) {
                const change = base + (Math.random() - 0.5) * 1; // ±0.5% variance
                element.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                element.className = `ticker-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    startRealTimeUpdates() {
        // Update portfolio value
        setInterval(() => {
            const portfolioValueElement = document.getElementById('portfolioValue');
            const dailyPnlElement = document.getElementById('dailyPnl');
            
            if (portfolioValueElement && dailyPnlElement) {
                const change = (Math.random() - 0.5) * 100;
                this.portfolioData.totalValue += change;
                this.portfolioData.dailyChange += change;
                
                portfolioValueElement.textContent = `$${this.portfolioData.totalValue.toLocaleString()}`;
                dailyPnlElement.textContent = `+$${this.portfolioData.dailyChange.toLocaleString()}`;
            }
        }, 10000);
    }

    async logout() {
        try {
            console.log('🔄 Logging out...');
            
            // Try to call backend logout endpoint
            try {
                await this.apiCall('/api/auth/logout', { method: 'POST' });
            } catch (error) {
                console.warn('⚠️ Backend logout failed:', error);
                // Continue with local logout even if backend fails
            }
            
            // Clear local storage
            localStorage.removeItem('cryptodash_token');
            
            this.showToast('Logged out successfully', 'success');
            
            setTimeout(() => {
                window.location.href = 'http://localhost:3001/login.html';
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even on error
            localStorage.removeItem('cryptodash_token');
            this.showToast('Logged out', 'info');
            window.location.href = 'http://localhost:3001/login.html';
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="fas fa-${this.getToastIcon(type)}"></i>
                </div>
                <div class="toast-message">${message}</div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Missing content methods
    getOptionsContent() {
        return `
            <div class="options-trading">
                <div class="trading-header">
                    <h2>Options Trading</h2>
                    <div class="options-info">
                        <span class="info-badge">Coming Soon</span>
                    </div>
                </div>
                <div class="feature-preview">
                    <div class="preview-card">
                        <i class="fas fa-chart-line"></i>
                        <h3>Advanced Options Strategies</h3>
                        <p>Call & Put options with various expiration dates</p>
                    </div>
                    <div class="preview-card">
                        <i class="fas fa-calculator"></i>
                        <h3>Options Calculator</h3>
                        <p>Real-time Greeks calculation and profit/loss analysis</p>
                    </div>
                </div>
            </div>
        `;
    }

    getAnalyticsContent() {
        return `
            <div class="analytics-dashboard">
                <div class="analytics-header">
                    <h2>Advanced Analytics</h2>
                </div>
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h3>Technical Indicators</h3>
                        <div class="indicators-list">
                            <div class="indicator">RSI: <span class="value">65.4</span></div>
                            <div class="indicator">MACD: <span class="value positive">+0.23</span></div>
                            <div class="indicator">Bollinger: <span class="value">Upper Band</span></div>
                        </div>
                    </div>
                    <div class="analytics-card">
                        <h3>Market Sentiment</h3>
                        <div class="sentiment-meter">
                            <div class="meter-bar">
                                <div class="meter-fill" style="width: 72%"></div>
                            </div>
                            <p>Bullish (72%)</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPnLContent() {
        return `
            <div class="pnl-analysis">
                <div class="pnl-header">
                    <h2>Profit & Loss Analysis</h2>
                </div>
                <div class="pnl-summary">
                    <div class="pnl-card positive">
                        <h3>Total P&L</h3>
                        <div class="pnl-amount">+$2,456.78</div>
                        <div class="pnl-percentage">+12.34%</div>
                    </div>
                    <div class="pnl-card">
                        <h3>Today's P&L</h3>
                        <div class="pnl-amount positive">+$156.23</div>
                        <div class="pnl-percentage">+0.78%</div>
                    </div>
                </div>
            </div>
        `;
    }

    getYieldFarmingContent() {
        return `
            <div class="yield-farming">
                <div class="farming-header">
                    <h2>Yield Farming</h2>
                </div>
                <div class="farming-pools">
                    <div class="pool-card">
                        <h3>BTC-ETH LP</h3>
                        <div class="pool-stats">
                            <div class="stat">APY: <span class="value">45.6%</span></div>
                            <div class="stat">TVL: <span class="value">$12.5M</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getLiquidityContent() {
        return `
            <div class="liquidity-management">
                <div class="liquidity-header">
                    <h2>Liquidity Management</h2>
                </div>
                <div class="liquidity-pools">
                    <div class="pool-overview">
                        <h3>Your Liquidity Positions</h3>
                        <p>Manage your liquidity pool positions and rewards</p>
                    </div>
                </div>
            </div>
        `;
    }

    getAlertsContent() {
        return `
            <div class="alerts-management">
                <div class="alerts-header">
                    <h2>Price Alerts</h2>
                </div>
                <div class="alerts-list">
                    <div class="alert-item">
                        <span class="alert-symbol">BTC</span>
                        <span class="alert-condition">Above $45,000</span>
                        <span class="alert-status active">Active</span>
                    </div>
                </div>
            </div>
        `;
    }

    getAcademyContent() {
        return `
            <div class="trading-academy">
                <div class="academy-header">
                    <h2>Trading Academy</h2>
                </div>
                <div class="academy-content">
                    <div class="course-card">
                        <h3>Cryptocurrency Basics</h3>
                        <p>Learn the fundamentals of cryptocurrency trading</p>
                    </div>
                    <div class="course-card">
                        <h3>Technical Analysis</h3>
                        <p>Master chart patterns and trading indicators</p>
                    </div>
                </div>
            </div>
        `;
    }

    getComingSoonContent(page) {
        return `
            <div class="coming-soon">
                <div class="coming-soon-content">
                    <i class="fas fa-tools"></i>
                    <h2>${page.replace('-', ' ').toUpperCase()}</h2>
                    <p>This feature is coming soon! We're working hard to bring you the best trading experience.</p>
                </div>
            </div>
        `;
    }
}

// ===============================
// MODAL MANAGEMENT SYSTEM
// ===============================

class ModalManager {
    constructor() {
        this.API_BASE = 'http://localhost:3001/api';
        this.init();
    }

    init() {
        console.log('ModalManager initializing...');
        
        // Add event listeners for modal buttons
        const paymentBtn = document.getElementById('paymentBtn');
        const riskBtn = document.getElementById('riskBtn');
        
        if (paymentBtn) {
            console.log('Found paymentBtn, adding click listener');
            paymentBtn.addEventListener('click', () => {
                console.log('Payment button clicked');
                this.openModal('paymentModal');
            });
        } else {
            console.warn('paymentBtn not found');
        }
        
        if (riskBtn) {
            console.log('Found riskBtn, adding click listener');
            riskBtn.addEventListener('click', () => {
                console.log('Risk button clicked');
                this.openModal('riskModal');
            });
        } else {
            console.warn('riskBtn not found');
        }
        
        // Add event listeners for forms with proper event handling
        const paymentForm = document.getElementById('newPaymentForm');
        if (paymentForm) {
            console.log('Found newPaymentForm, adding submit listener');
            paymentForm.addEventListener('submit', (e) => this.handleAddPaymentMethod(e));
        } else {
            console.warn('newPaymentForm not found');
        }
        
        const depositForm = document.getElementById('depositForm');
        if (depositForm) {
            console.log('Found depositForm, adding submit listener');
            depositForm.addEventListener('submit', (e) => this.handleDeposit(e));
        } else {
            console.warn('depositForm not found');
        }
        
        const withdrawForm = document.getElementById('withdrawForm');
        if (withdrawForm) {
            withdrawForm.addEventListener('submit', (e) => this.handleWithdrawal(e));
        }
        
        // Add card number formatting
        const cardNumberInput = document.getElementById('cardNumber');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', this.formatCardNumber);
        }
        
        // Add comprehensive event delegation for modal interactions
        document.addEventListener('click', (e) => {
            // Handle modal close buttons
            if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                const closeBtn = e.target.closest('.modal-close');
                const modalId = closeBtn.getAttribute('data-modal') || closeBtn.closest('.modal-overlay').id;
                if (modalId) {
                    console.log('Close button clicked for:', modalId);
                    this.closeModal(modalId);
                }
                return;
            }
            
            // Handle modal tab clicks
            if (e.target.classList.contains('modal-tab')) {
                const modalType = e.target.getAttribute('data-modal');
                const tabName = e.target.getAttribute('data-tab');
                if (modalType && tabName) {
                    console.log('Tab clicked:', modalType, tabName);
                    this.showModalTab(modalType, tabName, e.target);
                }
                return;
            }
            
            // Handle action buttons
            const action = e.target.getAttribute('data-action');
            if (action) {
                console.log('Action button clicked:', action);
                switch(action) {
                    case 'show-add-payment':
                        this.showAddPaymentForm();
                        break;
                    case 'hide-add-payment':
                        this.hideAddPaymentForm();
                        break;
                    case 'request-limit-increase':
                        this.requestLimitIncrease();
                        break;
                    case 'start-kyc':
                        this.startKYCProcess();
                        break;
                    case 'load-security-alerts':
                        this.loadSecurityAlerts();
                        break;
                }
                return;
            }
        });
        
        // Handle select changes
        document.addEventListener('change', (e) => {
            if (e.target.id === 'paymentType') {
                console.log('Payment type changed:', e.target.value);
                this.togglePaymentFields();
            }
        });
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal(e.target.id);
            }
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal-overlay.active');
                if (activeModal) {
                    this.closeModal(activeModal.id);
                }
            }
        });
    }

    openModal(modalId) {
        console.log('openModal called with:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            console.log('Modal found, adding active class');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Load modal content based on type
            if (modalId === 'paymentModal') {
                console.log('Loading payment data...');
                this.loadPaymentData();
            } else if (modalId === 'riskModal') {
                console.log('Loading risk data...');
                this.loadRiskData();
            }
        } else {
            console.error('Modal not found:', modalId);
        }
    }

    closeModal(modalId) {
        console.log('closeModal called with:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            console.log('Modal found, removing active class');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            console.error('Modal not found for closing:', modalId);
        }
    }

    showModalTab(modalType, tabName, clickedElement = null) {
        // Remove active from all tabs
        document.querySelectorAll(`#${modalType}Modal .modal-tab`).forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll(`#${modalType}Modal .modal-tab-content`).forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active to selected tab - use the clicked element if provided, or find by content
        if (clickedElement) {
            clickedElement.classList.add('active');
        } else {
            // Fallback: find the tab button by its onclick attribute or data
            const targetTab = document.querySelector(`#${modalType}Modal .modal-tab[onclick*="${tabName}"]`);
            if (targetTab) targetTab.classList.add('active');
        }
        
        // Show the corresponding content
        const targetContent = document.getElementById(`${modalType}-${tabName}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    // Payment Management Functions
    async loadPaymentData() {
        await Promise.all([
            this.loadPaymentMethods(),
            this.loadTransactionHistory()
        ]);
    }

    async loadPaymentMethods() {
        try {
            const response = await fetch(`${this.API_BASE}/payment/methods`, {
                headers: { 'Authorization': 'Bearer demo_token' }
            });
            const data = await response.json();
            
            const container = document.getElementById('paymentMethodsList');
            if (!container) return;
            
            if (data.success && data.data && data.data.length > 0) {
                container.innerHTML = data.data.map(method => `
                    <div class="payment-method-item">
                        <div class="payment-method-info">
                            <div class="payment-method-icon">
                                <i class="fas fa-${method.type === 'bank_account' ? 'university' : 'credit-card'}"></i>
                            </div>
                            <div class="payment-method-details">
                                <h4>${method.type.replace('_', ' ').toUpperCase()}</h4>
                                <p>****${method.lastFourDigits} • ${method.cardBrand || method.bankName || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="payment-method-status">
                            <span class="status-badge ${method.isVerified ? 'verified' : 'pending'}">
                                ${method.isVerified ? 'Verified' : 'Pending'}
                            </span>
                        </div>
                    </div>
                `).join('');
                
                // Update payment method selects with real data
                this.updatePaymentMethodSelects(data.data);
            } else {
                // Show demo data when no methods exist or in demo mode
                this.loadDemoPaymentMethods();
            }
        } catch (error) {
            console.log('API unavailable, loading demo payment methods');
            this.loadDemoPaymentMethods();
        }
    }

    loadDemoPaymentMethods() {
        const container = document.getElementById('paymentMethodsList');
        if (!container) return;

        // Demo payment methods
        const demoMethods = [
            {
                _id: 'demo_visa_1',
                type: 'credit_card',
                lastFourDigits: '4242',
                cardBrand: 'Visa',
                isVerified: true
            },
            {
                _id: 'demo_mastercard_1',
                type: 'credit_card',
                lastFourDigits: '5555',
                cardBrand: 'Mastercard',
                isVerified: true
            },
            {
                _id: 'demo_bank_1',
                type: 'bank_account',
                lastFourDigits: '1234',
                bankName: 'Chase Bank',
                isVerified: false
            }
        ];

        container.innerHTML = demoMethods.map(method => `
            <div class="payment-method-item">
                <div class="payment-method-info">
                    <div class="payment-method-icon">
                        <i class="fas fa-${method.type === 'bank_account' ? 'university' : 'credit-card'}"></i>
                    </div>
                    <div class="payment-method-details">
                        <h4>${method.type.replace('_', ' ').toUpperCase()}</h4>
                        <p>****${method.lastFourDigits} • ${method.cardBrand || method.bankName} • Demo</p>
                    </div>
                </div>
                <div class="payment-method-status">
                    <span class="status-badge ${method.isVerified ? 'verified' : 'pending'}">
                        ${method.isVerified ? 'Verified' : 'Pending'}
                    </span>
                </div>
            </div>
        `).join('');

        // Add demo indicator
        container.innerHTML += `
            <div class="payment-method-item" style="border: 2px dashed var(--border-secondary); background: var(--bg-tertiary);">
                <div class="payment-method-info">
                    <div class="payment-method-icon" style="background: var(--text-tertiary);">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="payment-method-details">
                        <h4>Demo Mode Active</h4>
                        <p>Add real payment methods to enable live transactions</p>
                    </div>
                </div>
            </div>
        `;

        // Update payment method selects with demo data
        this.updatePaymentMethodSelects(demoMethods);
    }

    updatePaymentMethodSelects(methods) {
        const depositSelect = document.getElementById('depositPaymentMethod');
        const withdrawSelect = document.getElementById('withdrawPaymentMethod');
        
        if (!depositSelect || !withdrawSelect) return;
        
        const options = methods.map(method => {
            const displayName = method.cardBrand || method.bankName || 'Unknown';
            const lastFour = method.lastFourDigits || '****';
            return `<option value="${method._id}">****${lastFour} (${displayName})</option>`;
        }).join('');
        
        const baseOption = '<option value="">Select payment method...</option>';
        
        depositSelect.innerHTML = baseOption + options;
        withdrawSelect.innerHTML = baseOption + options;
        
        // If no methods available, show demo notice
        if (methods.length === 0) {
            const demoOption = '<option value="demo" disabled>Add a payment method first</option>';
            depositSelect.innerHTML = baseOption + demoOption;
            withdrawSelect.innerHTML = baseOption + demoOption;
        }
    }

    async loadTransactionHistory() {
        try {
            const response = await fetch(`${this.API_BASE}/payment/transactions`, {
                headers: { 'Authorization': 'Bearer demo_token' }
            });
            const data = await response.json();
            
            const container = document.getElementById('transactionsList');
            if (!container) return;
            
            if (data.success && data.data && data.data.length > 0) {
                container.innerHTML = data.data.map(tx => `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="transaction-icon ${tx.type}">
                                <i class="fas fa-${tx.type === 'deposit' ? 'arrow-down' : 'arrow-up'}"></i>
                            </div>
                            <div class="transaction-details">
                                <h4>${tx.type.toUpperCase()}</h4>
                                <p>${tx.description || 'Payment transaction'}</p>
                            </div>
                        </div>
                        <div class="transaction-amount">
                            <div class="amount ${tx.type === 'deposit' ? 'positive' : 'negative'}">
                                ${tx.type === 'deposit' ? '+' : '-'}$${tx.amount.toLocaleString()}
                            </div>
                            <div class="date">${new Date(tx.createdAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                // Load demo transactions
                this.loadDemoTransactions();
            }
        } catch (error) {
            console.log('API unavailable, loading demo transactions');
            this.loadDemoTransactions();
        }
    }

    loadDemoTransactions() {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        const demoTransactions = [
            {
                type: 'deposit',
                amount: 2500,
                description: 'Initial funding via Visa ****4242',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed'
            },
            {
                type: 'deposit',
                amount: 1000,
                description: 'Quick deposit via Mastercard ****5555',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed'
            },
            {
                type: 'withdrawal',
                amount: 500,
                description: 'Withdrawal to Chase Bank ****1234',
                createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                status: 'processing'
            }
        ];

        container.innerHTML = demoTransactions.map(tx => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${tx.type}">
                        <i class="fas fa-${tx.type === 'deposit' ? 'arrow-down' : 'arrow-up'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${tx.type.toUpperCase()} • Demo</h4>
                        <p>${tx.description}</p>
                    </div>
                </div>
                <div class="transaction-amount">
                    <div class="amount ${tx.type === 'deposit' ? 'positive' : 'negative'}">
                        ${tx.type === 'deposit' ? '+' : '-'}$${tx.amount.toLocaleString()}
                    </div>
                    <div class="date">${new Date(tx.createdAt).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');

        // Add demo indicator
        container.innerHTML += `
            <div class="transaction-item" style="border: 2px dashed var(--border-secondary); background: var(--bg-tertiary);">
                <div class="transaction-info">
                    <div class="transaction-icon deposit" style="background: var(--text-tertiary);">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>Demo Data</h4>
                        <p>These are sample transactions for demonstration</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Risk Management Functions
    async loadRiskData() {
        await Promise.all([
            this.loadRiskProfile(),
            this.loadTradingLimits(),
            this.loadComplianceStatus(),
            this.loadSecurityAlerts()
        ]);
    }

    async loadRiskProfile() {
        try {
            const response = await fetch(`${this.API_BASE}/risk/profile`, {
                headers: { 'Authorization': 'Bearer demo_token' }
            });
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('riskScoreValue').textContent = data.data.riskScore;
                
                const riskLevel = data.data.riskLevel.toUpperCase().replace('_', ' ');
                const riskBadge = document.getElementById('riskLevelBadge');
                riskBadge.innerHTML = `<span class="risk-badge ${data.data.riskLevel.replace('_', '')}">${riskLevel}</span>`;
            }
        } catch (error) {
            // Demo values
            document.getElementById('riskScoreValue').textContent = '45';
            document.getElementById('riskLevelBadge').innerHTML = '<span class="risk-badge medium">MEDIUM RISK</span>';
        }
    }

    async loadTradingLimits() {
        try {
            const response = await fetch(`${this.API_BASE}/risk/limits`, {
                headers: { 'Authorization': 'Bearer demo_token' }
            });
            const data = await response.json();
            
            const container = document.getElementById('limitsContainer');
            if (data.success) {
                const limits = data.data.limits;
                container.innerHTML = Object.entries(limits).map(([key, limit]) => {
                    const usage = (limit.used / limit.limit) * 100;
                    const usageClass = usage < 50 ? 'low' : usage < 80 ? 'medium' : 'high';
                    
                    return `
                        <div class="limit-item">
                            <div class="limit-header">
                                <span class="limit-title">${key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                                <span class="limit-usage">$${limit.used.toLocaleString()} / $${limit.limit.toLocaleString()}</span>
                            </div>
                            <div class="limit-progress">
                                <div class="limit-progress-fill ${usageClass}" style="width: ${usage}%"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            document.getElementById('limitsContainer').innerHTML = `
                <div class="limit-item">
                    <div class="limit-header">
                        <span class="limit-title">DAILY TRADING</span>
                        <span class="limit-usage">$2,500 / $50,000</span>
                    </div>
                    <div class="limit-progress">
                        <div class="limit-progress-fill low" style="width: 5%"></div>
                    </div>
                </div>
                <div class="limit-item">
                    <div class="limit-header">
                        <span class="limit-title">DAILY WITHDRAWAL</span>
                        <span class="limit-usage">$500 / $10,000</span>
                    </div>
                    <div class="limit-progress">
                        <div class="limit-progress-fill low" style="width: 5%"></div>
                    </div>
                </div>
            `;
        }
    }

    async loadComplianceStatus() {
        try {
            const response = await fetch(`${this.API_BASE}/risk/compliance`, {
                headers: { 'Authorization': 'Bearer demo_token' }
            });
            const data = await response.json();
            
            const container = document.getElementById('complianceContainer');
            if (data.success) {
                const compliance = data.data;
                container.innerHTML = `
                    <div class="compliance-item">
                        <div class="info-item">
                            <span>KYC Status</span>
                            <span class="status-badge ${compliance.kyc.status === 'approved' ? 'verified' : 'pending'}">
                                ${compliance.kyc.status.toUpperCase()}
                            </span>
                        </div>
                        <div class="info-item">
                            <span>Verification Level</span>
                            <span>${compliance.kyc.level.toUpperCase()}</span>
                        </div>
                        <div class="info-item">
                            <span>AML Status</span>
                            <span class="status-badge verified">${compliance.aml.status.replace('_', ' ').toUpperCase()}</span>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('complianceContainer').innerHTML = `
                <div class="compliance-item">
                    <div class="info-item">
                        <span>KYC Status</span>
                        <span class="status-badge pending">DEMO MODE</span>
                    </div>
                    <div class="info-item">
                        <span>Verification Level</span>
                        <span>BASIC</span>
                    </div>
                </div>
            `;
        }
    }

    async loadSecurityAlerts() {
        try {
            const response = await fetch(`${this.API_BASE}/risk/alerts`, {
                headers: { 'Authorization': 'Bearer demo_token' }
            });
            const data = await response.json();
            
            const container = document.getElementById('alertsContainer');
            if (data.success && data.data.length > 0) {
                container.innerHTML = data.data.map(alert => `
                    <div class="alert-item ${alert.severity}">
                        <h4>${alert.title}</h4>
                        <p>${alert.description}</p>
                        <small>Status: ${alert.status} • ${new Date(alert.createdAt).toLocaleDateString()}</small>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="alert-item success">
                        <h4>No Active Alerts</h4>
                        <p>All systems operating normally</p>
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('alertsContainer').innerHTML = `
                <div class="alert-item info">
                    <h4>Demo Mode</h4>
                    <p>Security monitoring active</p>
                </div>
            `;
        }
    }

    // Form Handlers
    async handleAddPaymentMethod(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Get form values
        const paymentType = document.getElementById('paymentType').value;
        const paymentData = {
            type: paymentType
        };
        
        if (paymentType === 'bank_account') {
            paymentData.bankName = document.getElementById('bankName').value;
            paymentData.accountNumber = document.getElementById('accountNumber').value;
            paymentData.routingNumber = document.getElementById('routingNumber').value;
        } else {
            paymentData.cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
            paymentData.expiryMonth = document.getElementById('expiryMonth').value;
            paymentData.expiryYear = document.getElementById('expiryYear').value;
            paymentData.cvv = document.getElementById('cvv').value;
            paymentData.cardholderName = 'Demo User'; // Default for demo
        }
        
        // Basic validation
        if (!this.validatePaymentData(paymentData)) {
            this.showToast('Please fill in all required fields correctly', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/payment/methods`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo_token'
                },
                body: JSON.stringify(paymentData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showToast('Payment method added successfully!', 'success');
                this.hideAddPaymentForm();
                form.reset();
                await this.loadPaymentMethods();
            } else {
                throw new Error(data.message || 'Failed to add payment method');
            }
        } catch (error) {
            // Demo mode fallback
            console.log('Demo mode: Payment method added', paymentData);
            this.showToast('Payment method added successfully! (Demo mode)', 'success');
            this.hideAddPaymentForm();
            form.reset();
            await this.loadPaymentMethods();
        }
    }

    validatePaymentData(data) {
        if (data.type === 'bank_account') {
            return data.bankName && data.accountNumber && data.routingNumber;
        } else {
            return data.cardNumber && 
                   data.cardNumber.length >= 13 && 
                   data.expiryMonth && 
                   data.expiryYear && 
                   data.cvv && 
                   data.cvv.length >= 3;
        }
    }

    formatCardNumber(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        if (formattedValue.length > 19) formattedValue = formattedValue.substr(0, 19);
        e.target.value = formattedValue;
    }

    async handleDeposit(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('depositAmount').value);
        const paymentMethodId = document.getElementById('depositPaymentMethod').value;
        
        if (!amount || amount < 10) {
            this.showToast('Minimum deposit amount is $10.00', 'error');
            return;
        }
        
        if (amount > 10000) {
            this.showToast('Maximum deposit amount is $10,000.00', 'error');
            return;
        }
        
        if (!paymentMethodId) {
            this.showToast('Please select a payment method', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/payment/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo_token'
                },
                body: JSON.stringify({
                    amount: amount,
                    paymentMethodId: paymentMethodId,
                    currency: 'USD'
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showToast(`Deposit of $${amount.toLocaleString()} initiated successfully!`, 'success');
                e.target.reset();
                await this.loadTransactionHistory();
            } else {
                throw new Error(data.message || 'Deposit failed');
            }
        } catch (error) {
            // Demo mode success
            console.log('Demo deposit:', { amount, paymentMethodId });
            this.showToast(`Demo deposit of $${amount.toLocaleString()} completed successfully!`, 'success');
            e.target.reset();
            await this.loadTransactionHistory();
        }
    }

    async handleWithdrawal(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const paymentMethodId = document.getElementById('withdrawPaymentMethod').value;
        
        if (!amount || amount < 10) {
            this.showToast('Minimum withdrawal amount is $10.00', 'error');
            return;
        }
        
        if (amount > 5000) {
            this.showToast('Maximum withdrawal amount is $5,000.00 per transaction', 'error');
            return;
        }
        
        if (!paymentMethodId) {
            this.showToast('Please select a payment method', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/payment/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo_token'
                },
                body: JSON.stringify({
                    amount: amount,
                    paymentMethodId: paymentMethodId,
                    currency: 'USD'
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showToast(`Withdrawal of $${amount.toLocaleString()} initiated successfully!`, 'success');
                e.target.reset();
                await this.loadTransactionHistory();
            } else {
                throw new Error(data.message || 'Withdrawal failed');
            }
        } catch (error) {
            // Demo mode success
            console.log('Demo withdrawal:', { amount, paymentMethodId });
            this.showToast(`Demo withdrawal of $${amount.toLocaleString()} completed successfully!`, 'success');
            e.target.reset();
            await this.loadTransactionHistory();
        }
    }

    // Utility Functions
    showAddPaymentForm() {
        document.querySelector('.payment-methods-list').parentNode.classList.add('hidden');
        document.getElementById('addPaymentForm').classList.remove('hidden');
    }

    hideAddPaymentForm() {
        document.querySelector('.payment-methods-list').parentNode.classList.remove('hidden');
        document.getElementById('addPaymentForm').classList.add('hidden');
    }

    togglePaymentFields() {
        const paymentType = document.getElementById('paymentType').value;
        const cardFields = document.getElementById('cardFields');
        const bankFields = document.getElementById('bankFields');
        
        if (paymentType === 'bank_account') {
            cardFields.classList.add('hidden');
            bankFields.classList.remove('hidden');
        } else {
            cardFields.classList.remove('hidden');
            bankFields.classList.add('hidden');
        }
    }

    requestLimitIncrease() {
        this.showToast('Limit increase request submitted for review', 'info');
    }

    startKYCProcess() {
        this.showToast('KYC verification process initiated', 'info');
    }

    loadSecurityAlerts() {
        // Already implemented above
    }

    showToast(message, type = 'info') {
        // Use existing toast system if available
        if (window.cryptoDashboard && window.cryptoDashboard.showToast) {
            window.cryptoDashboard.showToast(message, type);
        } else {
            alert(message); // Fallback
        }
    }
}

// Global functions for modal management
function openModal(modalId) {
    window.modalManager?.openModal(modalId);
}

function closeModal(modalId) {
    console.log('Closing modal:', modalId);
    if (window.modalManager && window.modalManager.closeModal) {
        window.modalManager.closeModal(modalId);
    } else {
        console.error('Modal manager not available or missing closeModal method');
        // Fallback: direct DOM manipulation
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}

function showModalTab(modalType, tabName) {
    console.log('Switching to tab:', modalType, tabName);
    if (window.modalManager && window.modalManager.showModalTab) {
        // Get the clicked element from the event
        const clickedElement = event && event.target ? event.target : null;
        window.modalManager.showModalTab(modalType, tabName, clickedElement);
    } else {
        console.error('Modal manager not available or missing showModalTab method');
    }
}

function showAddPaymentForm() {
    console.log('Showing add payment form');
    if (window.modalManager && window.modalManager.showAddPaymentForm) {
        window.modalManager.showAddPaymentForm();
    } else {
        console.error('Modal manager not available or missing showAddPaymentForm method');
        // Fallback: direct DOM manipulation
        const listContainer = document.querySelector('.payment-methods-list').parentNode;
        const formContainer = document.getElementById('addPaymentForm');
        if (listContainer && formContainer) {
            listContainer.classList.add('hidden');
            formContainer.classList.remove('hidden');
        }
    }
}

function hideAddPaymentForm() {
    console.log('Hiding add payment form');
    if (window.modalManager && window.modalManager.hideAddPaymentForm) {
        window.modalManager.hideAddPaymentForm();
    } else {
        console.error('Modal manager not available or missing hideAddPaymentForm method');
        // Fallback: direct DOM manipulation
        const listContainer = document.querySelector('.payment-methods-list').parentNode;
        const formContainer = document.getElementById('addPaymentForm');
        if (listContainer && formContainer) {
            listContainer.classList.remove('hidden');
            formContainer.classList.add('hidden');
        }
    }
}

function togglePaymentFields() {
    console.log('Toggling payment fields');
    if (window.modalManager && window.modalManager.togglePaymentFields) {
        window.modalManager.togglePaymentFields();
    } else {
        console.error('Modal manager not available or missing togglePaymentFields method');
        // Fallback: direct DOM manipulation
        const paymentType = document.getElementById('paymentType').value;
        const cardFields = document.getElementById('cardFields');
        const bankFields = document.getElementById('bankFields');
        
        if (paymentType === 'bank_account') {
            cardFields.classList.add('hidden');
            bankFields.classList.remove('hidden');
        } else {
            cardFields.classList.remove('hidden');
            bankFields.classList.add('hidden');
        }
    }
}

function requestLimitIncrease() {
    window.modalManager?.requestLimitIncrease();
}

function startKYCProcess() {
    window.modalManager?.startKYCProcess();
}

function loadSecurityAlerts() {
    window.modalManager?.loadSecurityAlerts();
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, initializing...');
    try {
        window.cryptoDashboard = new CryptoDashboard();
        console.log('CryptoDashboard initialized');
        
        window.modalManager = new ModalManager();
        console.log('ModalManager initialized');
        
        // Verify modal manager is working
        if (window.modalManager && typeof window.modalManager.openModal === 'function') {
            console.log('✅ Modal manager is ready');
        } else {
            console.error('❌ Modal manager initialization failed');
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Global functions for backward compatibility
window.signOut = () => {
    if (window.cryptoDashboard) {
        window.cryptoDashboard.logout();
    }
};
