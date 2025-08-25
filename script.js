// Professional CryptoDash JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 CryptoDash initializing...');
    
    // Initialize all functionality
    initNavigation();
    initAnimations();
    initTradingTerminal();
    initPortfolio();
    initPortfolioHandlers();
    initAnalytics();
    initContactForm();
    initTheme();
    initRealTimeData();
    initCharts();
    initAPIIntegration();
    initUserPreferences();
    initAdvancedAnimations();
    initDataExport();
    
    // Test API connection immediately
    setTimeout(async () => {
        console.log('🔄 Connecting to CoinGecko API...');
        try {
            await fetchCryptoData();
        } catch (error) {
            console.error('❌ Failed to connect to CoinGecko API:', error);
            console.log('💡 Please check your internet connection or try again later');
        }
    }, 2000);
    
    console.log('✅ CryptoDash loaded successfully!');
});

// API Configuration
const API_CONFIG = {
    coingecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        endpoints: {
            coins: '/coins/markets',
            prices: '/simple/price',
            historical: '/coins/{id}/market_chart'
        }
    },
    updateInterval: 30000 // 30 seconds
};

// Global state management
const AppState = {
    cryptoData: {},
    userPreferences: {
        theme: 'light',
        currency: 'usd',
        favoriteCoins: ['bitcoin', 'ethereum', 'cardano'],
        chartSettings: {
            period: '7d',
            indicators: ['sma', 'rsi']
        }
    },
    charts: {},
    portfolio: {
        holdings: {
            bitcoin: { amount: 0.8456, symbol: 'BTC' },
            ethereum: { amount: 12.345, symbol: 'ETH' },
            cardano: { amount: 1250.75, symbol: 'ADA' },
            solana: { amount: 25.67, symbol: 'SOL' }
        },
        totalValue: 0,
        totalChange24h: 0,
        lastUpdated: null
    },
    isOnline: navigator.onLine
};

// API Integration
async function initAPIIntegration() {
    if (!AppState.isOnline) {
        console.log('Offline mode');
        return;
    }

    try {
        await fetchCryptoData();
        
        // Set up automatic updates every 30 seconds
        setInterval(async () => {
            try {
                await fetchCryptoData();
            } catch (error) {
                console.error('❌ Auto-update failed:', error);
            }
        }, API_CONFIG.updateInterval);
        
        // Listen for online/offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        console.log('✅ API Integration initialized with auto-updates');
    } catch (error) {
        console.error('❌ API Integration failed:', error);
    }
}

// Fetch real cryptocurrency data
async function fetchCryptoData() {
    try {
        // Direct call to CoinGecko API
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,solana,avalanche-2,polygon&vs_currencies=usd&include_24hr_change=true`
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        AppState.cryptoData = processAPIData(data);
        
        updatePriceDisplays();
        updateCharts();
        updatePortfolioDisplays();
        
        console.log('📊 Crypto data updated:', data);
        return data;
    } catch (error) {
        console.error('❌ CoinGecko API Error:', error);
        throw error; 
    }
}

// Process API data into our format
function processAPIData(data) {
    const processed = {};
    
    // Map API data to our internal format
    if (data.bitcoin) {
        processed.bitcoin = {
            price: data.bitcoin.usd,
            change: data.bitcoin.usd_24h_change || 0
        };
    }
    
    if (data.ethereum) {
        processed.ethereum = {
            price: data.ethereum.usd,
            change: data.ethereum.usd_24h_change || 0
        };
    }
    
    if (data.cardano) {
        processed.cardano = {
            price: data.cardano.usd,
            change: data.cardano.usd_24h_change || 0
        };
    }
    
    if (data.solana) {
        processed.solana = {
            price: data.solana.usd,
            change: data.solana.usd_24h_change || 0
        };
    }
    
    if (data['avalanche-2']) {
        processed.avalanche = {
            price: data['avalanche-2'].usd,
            change: data['avalanche-2'].usd_24h_change || 0
        };
    }
    
    if (data.polygon) {
        processed.polygon = {
            price: data.polygon.usd,
            change: data.polygon.usd_24h_change || 0
        };
    }
    
    return processed;
}

// Update price displays in the UI
function updatePriceDisplays() {
    const cryptoData = AppState.cryptoData;
    
    // Update hero section price tickers
    updateTickerItem('BTC/USD', cryptoData.bitcoin);
    updateTickerItem('ETH/USD', cryptoData.ethereum);
    updateTickerItem('ADA/USD', cryptoData.cardano);
    
    // Update analytics section metrics
    updateAnalyticsMetrics();
    
    // Update portfolio values
    updatePortfolioValues();
    
    console.log('💰 Price displays updated');
}

// Helper function to update individual ticker items
function updateTickerItem(symbol, data) {
    if (!data) return;
    
    const tickerItems = document.querySelectorAll('.ticker-item');
    
    tickerItems.forEach(item => {
        const symbolElement = item.querySelector('.symbol');
        if (symbolElement && symbolElement.textContent === symbol) {
            const priceElement = item.querySelector('.price');
            const changeElement = item.querySelector('.change');
            
            if (priceElement) {
                const formattedPrice = data.price < 1 
                    ? `$${data.price.toFixed(4)}` 
                    : `$${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                
                priceElement.textContent = formattedPrice;
                priceElement.className = `price ${data.change >= 0 ? 'positive' : 'negative'}`;
            }
            
            if (changeElement) {
                const formattedChange = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%`;
                changeElement.textContent = formattedChange;
                changeElement.className = `change ${data.change >= 0 ? 'positive' : 'negative'}`;
            }
        }
    });
}

// Update analytics section with real market data
function updateAnalyticsMetrics() {
    const cryptoData = AppState.cryptoData;
    
    // Calculate total market cap (simplified)
    let totalMarketCap = 0;
    if (cryptoData.bitcoin) totalMarketCap += cryptoData.bitcoin.price * 19700000; // Approx BTC supply
    if (cryptoData.ethereum) totalMarketCap += cryptoData.ethereum.price * 120000000; // Approx ETH supply
    
    // Update market cap display
    const marketCapElement = document.querySelector('.metric-value');
    if (marketCapElement && totalMarketCap > 0) {
        const formattedCap = `$${(totalMarketCap / 1000000000000).toFixed(1)}T`;
        marketCapElement.textContent = formattedCap;
    }
}

// Update portfolio section values 
function updatePortfolioValues() {
    updatePortfolioDisplays();
}

// Update price displays with real data
function updatePriceDisplays() {
    const priceElements = document.querySelectorAll('[data-crypto-id]');
    
    priceElements.forEach(element => {
        const cryptoId = element.dataset.cryptoId;
        const dataType = element.dataset.type;
        const crypto = AppState.cryptoData[cryptoId];
        
        if (crypto) {
            switch (dataType) {
                case 'price':
                    element.textContent = formatPrice(crypto.price);
                    break;
                case 'change':
                    element.textContent = formatPercentage(crypto.change24h);
                    element.className = `change ${crypto.change24h >= 0 ? 'positive' : 'negative'}`;
                    break;
                case 'volume':
                    element.textContent = formatVolume(crypto.volume);
                    break;
            }
        }
    });
}

// Format utilities
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: price > 1 ? 2 : 6
    }).format(price);
}

function formatPercentage(value) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatVolume(volume) {
    if (volume >= 1e9) {
        return `$${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
        return `$${(volume / 1e6).toFixed(2)}M`;
    } else {
        return `$${(volume / 1e3).toFixed(2)}K`;
    }
}

// Handle online/offline states
function handleOnline() {
    AppState.isOnline = true;
    fetchCryptoData();
    showNotification('Connected to real-time data', 'success');
}

function handleOffline() {
    AppState.isOnline = false;
    showNotification('Offline mode - using cached data', 'warning');
}

// Loading states
function showLoadingState() {
    const loadingElements = document.querySelectorAll('.data-loading');
    loadingElements.forEach(el => el.classList.add('loading'));
}

function hideLoadingState() {
    const loadingElements = document.querySelectorAll('.data-loading');
    loadingElements.forEach(el => el.classList.remove('loading'));
}

function handleAPIError(error) {
    hideLoadingState();
    showNotification('Unable to fetch live data. Using cached data.', 'error');
    fallbackToMockData();
}

// Technical Indicators Implementation
class TechnicalIndicators {
    // Simple Moving Average
    static sma(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
        return result;
    }
    
    // Exponential Moving Average
    static ema(data, period) {
        const result = [];
        const k = 2 / (period + 1);
        result[0] = data[0];
        
        for (let i = 1; i < data.length; i++) {
            result[i] = data[i] * k + result[i - 1] * (1 - k);
        }
        return result;
    }
    
    // Relative Strength Index
    static rsi(data, period = 14) {
        const gains = [];
        const losses = [];
        
        // Calculate gains and losses
        for (let i = 1; i < data.length; i++) {
            const change = data[i] - data[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        // Calculate RSI
        const result = [];
        for (let i = period - 1; i < gains.length; i++) {
            const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
            const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
            
            if (avgLoss === 0) {
                result.push(100);
            } else {
                const rs = avgGain / avgLoss;
                result.push(100 - (100 / (1 + rs)));
            }
        }
        return result;
    }
    
    // MACD (Moving Average Convergence Divergence)
    static macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.ema(data, fastPeriod);
        const slowEMA = this.ema(data, slowPeriod);
        
        // Calculate MACD line
        const macdLine = [];
        const minLength = Math.min(fastEMA.length, slowEMA.length);
        for (let i = 0; i < minLength; i++) {
            macdLine.push(fastEMA[i] - slowEMA[i]);
        }
        
        // Calculate signal line (EMA of MACD)
        const signalLine = this.ema(macdLine, signalPeriod);
        
        // Calculate histogram
        const histogram = [];
        for (let i = 0; i < signalLine.length; i++) {
            histogram.push(macdLine[i] - signalLine[i]);
        }
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }
    
    // Bollinger Bands
    static bollingerBands(data, period = 20, standardDeviations = 2) {
        const sma = this.sma(data, period);
        const upperBand = [];
        const lowerBand = [];
        
        for (let i = period - 1; i < data.length; i++) {
            const subset = data.slice(i - period + 1, i + 1);
            const mean = sma[i - period + 1];
            const variance = subset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
            const stdDev = Math.sqrt(variance);
            
            upperBand.push(mean + (stdDev * standardDeviations));
            lowerBand.push(mean - (stdDev * standardDeviations));
        }
        
        return {
            upper: upperBand,
            middle: sma,
            lower: lowerBand
        };
    }
}

// Advanced Chart with Technical Indicators
function createAdvancedChart(canvas, data, indicators = []) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set up chart area
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Process data
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices) * 0.98;
    const maxPrice = Math.max(...prices) * 1.02;
    const priceRange = maxPrice - minPrice;
    
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    drawGrid(ctx, padding, chartWidth, chartHeight, minPrice, maxPrice);
    
    // Draw price line
    drawPriceLine(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange);
    
    // Draw technical indicators
    indicators.forEach(indicator => {
        switch (indicator.type) {
            case 'sma':
                drawSMA(ctx, prices, indicator.period, padding, chartWidth, chartHeight, minPrice, priceRange);
                break;
            case 'ema':
                drawEMA(ctx, prices, indicator.period, padding, chartWidth, chartHeight, minPrice, priceRange);
                break;
            case 'rsi':
                drawRSI(ctx, prices, padding, width, height);
                break;
            case 'macd':
                drawMACD(ctx, prices, padding, width, height);
                break;
            case 'bollinger':
                drawBollingerBands(ctx, prices, padding, chartWidth, chartHeight, minPrice, priceRange);
                break;
        }
    });
    
    // Draw crosshair on hover
    addChartInteractivity(canvas, data, padding, chartWidth, chartHeight, minPrice, priceRange);
}

function drawGrid(ctx, padding, chartWidth, chartHeight, minPrice, maxPrice) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
        
        // Price labels
        const price = maxPrice - ((maxPrice - minPrice) / 5) * i;
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(formatPrice(price), padding - 10, y + 4);
    }
    
    // Vertical lines
    for (let i = 0; i <= 10; i++) {
        const x = padding + (chartWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + chartHeight);
        ctx.stroke();
    }
}

function drawPriceLine(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange) {
    ctx.strokeStyle = '#0052ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    data.forEach((point, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Add gradient fill
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, 'rgba(0, 82, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 82, 255, 0.0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
}

function drawSMA(ctx, prices, period, padding, chartWidth, chartHeight, minPrice, priceRange) {
    const sma = TechnicalIndicators.sma(prices, period);
    
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    sma.forEach((value, index) => {
        const x = padding + (chartWidth / (prices.length - 1)) * (index + period - 1);
        const y = padding + chartHeight - ((value - minPrice) / priceRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawEMA(ctx, prices, period, padding, chartWidth, chartHeight, minPrice, priceRange) {
    const ema = TechnicalIndicators.ema(prices, period);
    
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);
    
    ctx.beginPath();
    ema.forEach((value, index) => {
        const x = padding + (chartWidth / (prices.length - 1)) * index;
        const y = padding + chartHeight - ((value - minPrice) / priceRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawRSI(ctx, prices, padding, width, height) {
    const rsi = TechnicalIndicators.rsi(prices);
    const rsiHeight = 60;
    const rsiY = height - padding - rsiHeight;
    
    // RSI background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(padding, rsiY, width - padding * 2, rsiHeight);
    
    // RSI line
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    rsi.forEach((value, index) => {
        const x = padding + ((width - padding * 2) / (rsi.length - 1)) * index;
        const y = rsiY + rsiHeight - (value / 100) * rsiHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // RSI levels
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // Overbought (70)
    const overboughtY = rsiY + rsiHeight - (70 / 100) * rsiHeight;
    ctx.beginPath();
    ctx.moveTo(padding, overboughtY);
    ctx.lineTo(width - padding, overboughtY);
    ctx.stroke();
    
    // Oversold (30)
    const oversoldY = rsiY + rsiHeight - (30 / 100) * rsiHeight;
    ctx.beginPath();
    ctx.moveTo(padding, oversoldY);
    ctx.stroke();
    
    ctx.setLineDash([]);
}

// Data Export Functionality
function initDataExport() {
    addExportButtons();
    console.log('📥 Data export initialized');
}

function addExportButtons() {
    // Add export buttons to portfolio section
    const portfolioHeader = document.querySelector('.portfolio-header');
    if (portfolioHeader) {
        const exportGroup = document.createElement('div');
        exportGroup.className = 'export-group';
        exportGroup.innerHTML = `
            <button class="btn btn-outline btn-small" onclick="exportToCSV()">
                <i class="fas fa-download"></i> Export CSV
            </button>
            <button class="btn btn-outline btn-small" onclick="exportToPDF()">
                <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-outline btn-small" onclick="exportChartImage()">
                <i class="fas fa-image"></i> Save Chart
            </button>
        `;
        portfolioHeader.appendChild(exportGroup);
    }
}

// Export portfolio data to CSV
function exportToCSV() {
    try {
        const portfolioData = getPortfolioData();
        const csvContent = generateCSV(portfolioData);
        downloadFile(csvContent, 'cryptodash-portfolio.csv', 'text/csv');
        showNotification('Portfolio exported to CSV successfully!', 'success');
    } catch (error) {
        console.error('CSV Export Error:', error);
        showNotification('Failed to export CSV', 'error');
    }
}

// Export portfolio data to PDF
async function exportToPDF() {
    try {
        showLoadingState();
        const pdfContent = await generatePDF();
        downloadFile(pdfContent, 'cryptodash-portfolio.pdf', 'application/pdf');
        hideLoadingState();
        showNotification('Portfolio exported to PDF successfully!', 'success');
    } catch (error) {
        console.error('PDF Export Error:', error);
        hideLoadingState();
        showNotification('Failed to export PDF', 'error');
    }
}

// Export chart as image
function exportChartImage() {
    try {
        const canvas = document.getElementById('tradingChart');
        if (canvas) {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'cryptodash-chart.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification('Chart saved as image!', 'success');
            });
        }
    } catch (error) {
        console.error('Chart Export Error:', error);
        showNotification('Failed to export chart', 'error');
    }
}

// Get portfolio data for export
function getPortfolioData() {
    const data = [];
    const tableRows = document.querySelectorAll('.table-row');
    
    tableRows.forEach(row => {
        const assetName = row.querySelector('.asset-name')?.textContent || '';
        const assetSymbol = row.querySelector('.asset-symbol')?.textContent || '';
        const holdings = row.querySelector('.holdings')?.textContent || '';
        const price = row.querySelector('.price')?.textContent || '';
        const change = row.querySelector('.change')?.textContent || '';
        const value = row.querySelector('.value')?.textContent || '';
        
        if (assetName) {
            data.push({
                Asset: assetName,
                Symbol: assetSymbol,
                Holdings: holdings,
                Price: price,
                'Change (24h)': change,
                Value: value,
                'Export Date': new Date().toISOString()
            });
        }
    });
    
    return data;
}

// Generate CSV content
function generateCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(',')
        )
    ];
    
    return csvRows.join('\n');
}

// Generate PDF content 
async function generatePDF() {
    const content = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
100 700 Td
(CryptoDash Portfolio Report) Tj
0 -20 Td
(Generated: ${new Date().toLocaleDateString()}) Tj
0 -40 Td
(Portfolio Summary:) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000274 00000 n 
0000000526 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
625
%%EOF`;
    
    return content;
}

// Download file helper
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// User Preferences Management
function initUserPreferences() {
    loadUserPreferences();
    setupPreferenceListeners();
    console.log('⚙️ User preferences initialized');
}

function loadUserPreferences() {
    const saved = localStorage.getItem('cryptodash-preferences');
    if (saved) {
        try {
            AppState.userPreferences = { ...AppState.userPreferences, ...JSON.parse(saved) };
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }
    }
    applyUserPreferences();
}

function saveUserPreferences() {
    try {
        localStorage.setItem('cryptodash-preferences', JSON.stringify(AppState.userPreferences));
    } catch (error) {
        console.error('Failed to save user preferences:', error);
    }
}

function applyUserPreferences() {
    // Apply theme
    if (AppState.userPreferences.theme) {
        document.documentElement.setAttribute('data-theme', AppState.userPreferences.theme);
    }
    
    // Apply currency preference
    updateCurrencyDisplays();
    
    // Apply chart settings
    updateChartSettings();
}

function setupPreferenceListeners() {
    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            AppState.userPreferences.theme = newTheme;
            saveUserPreferences();
            
            // Update icon
            const icon = themeToggle.querySelector('i');
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            
            // Update navbar background immediately when theme changes
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                const isDarkTheme = newTheme === 'dark';
                if (window.scrollY > 100) {
                    navbar.style.background = isDarkTheme ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)';
                } else {
                    navbar.style.background = isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
                }
            }
        });
    }
    
    // Add preference panel
    addPreferencePanel();
}

function addPreferencePanel() {
    const nav = document.querySelector('.nav-actions');
    if (nav) {
        const prefsButton = document.createElement('button');
        prefsButton.className = 'btn btn-outline';
        prefsButton.innerHTML = '<i class="fas fa-cog"></i>';
        prefsButton.onclick = () => showPreferenceModal();
        nav.insertBefore(prefsButton, nav.firstChild);
    }
}

function showPreferenceModal() {
    const modal = document.createElement('div');
    modal.className = 'preference-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closePreferenceModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>Settings</h3>
                <button onclick="closePreferenceModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="preference-group">
                    <label>Currency</label>
                    <select id="currency-select" onchange="updateCurrency(this.value)">
                        <option value="usd" ${AppState.userPreferences.currency === 'usd' ? 'selected' : ''}>USD</option>
                        <option value="eur" ${AppState.userPreferences.currency === 'eur' ? 'selected' : ''}>EUR</option>
                        <option value="btc" ${AppState.userPreferences.currency === 'btc' ? 'selected' : ''}>BTC</option>
                    </select>
                </div>
                <div class="preference-group">
                    <label>Chart Period</label>
                    <select id="period-select" onchange="updateChartPeriod(this.value)">
                        <option value="1d" ${AppState.userPreferences.chartSettings.period === '1d' ? 'selected' : ''}>1 Day</option>
                        <option value="7d" ${AppState.userPreferences.chartSettings.period === '7d' ? 'selected' : ''}>7 Days</option>
                        <option value="30d" ${AppState.userPreferences.chartSettings.period === '30d' ? 'selected' : ''}>30 Days</option>
                        <option value="1y" ${AppState.userPreferences.chartSettings.period === '1y' ? 'selected' : ''}>1 Year</option>
                    </select>
                </div>
                <div class="preference-group">
                    <label>Technical Indicators</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" ${AppState.userPreferences.chartSettings.indicators.includes('sma') ? 'checked' : ''} 
                                   onchange="toggleIndicator('sma', this.checked)">
                            <span>Simple Moving Average</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" ${AppState.userPreferences.chartSettings.indicators.includes('rsi') ? 'checked' : ''} 
                                   onchange="toggleIndicator('rsi', this.checked)">
                            <span>RSI</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" ${AppState.userPreferences.chartSettings.indicators.includes('macd') ? 'checked' : ''} 
                                   onchange="toggleIndicator('macd', this.checked)">
                            <span>MACD</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
}

function closePreferenceModal() {
    const modal = document.querySelector('.preference-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function updateCurrency(currency) {
    AppState.userPreferences.currency = currency;
    saveUserPreferences();
    updateCurrencyDisplays();
    fetchCryptoData(); 
}

function updateChartPeriod(period) {
    AppState.userPreferences.chartSettings.period = period;
    saveUserPreferences();
    updateCharts();
}

function toggleIndicator(indicator, enabled) {
    if (enabled) {
        if (!AppState.userPreferences.chartSettings.indicators.includes(indicator)) {
            AppState.userPreferences.chartSettings.indicators.push(indicator);
        }
    } else {
        AppState.userPreferences.chartSettings.indicators = 
            AppState.userPreferences.chartSettings.indicators.filter(i => i !== indicator);
    }
    saveUserPreferences();
    updateCharts();
}

function updateCurrencyDisplays() {
    // Update all price displays based on currency preference
    const currency = AppState.userPreferences.currency.toUpperCase();
    const currencyElements = document.querySelectorAll('.currency-symbol');
    currencyElements.forEach(el => el.textContent = currency);
}

// Advanced Animations and Micro-interactions
function initAdvancedAnimations() {
    setupScrollAnimations();
    setupHoverEffects();
    setupLoadingAnimations();
    setupCounterAnimations();
    setupParallaxEffects();
    setupParticleSystem();
    console.log('✨ Advanced animations initialized');
}

// Intersection Observer for scroll animations
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Stagger child animations
                const children = entry.target.querySelectorAll('.stagger-item');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.classList.add('animate-in');
                    }, index * 100);
                });
            }
        });
    }, observerOptions);

    // Observe elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// Enhanced hover effects
function setupHoverEffects() {
    // Card hover effects
    document.querySelectorAll('.feature-card, .analytics-card').forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            e.target.style.transform = 'translateY(-8px) scale(1.02)';
            e.target.style.boxShadow = '0 20px 40px rgba(0, 82, 255, 0.15)';
        });
        
        card.addEventListener('mouseleave', (e) => {
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        });
    });

    // Button magnetic effect
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            btn.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) scale(1.05)`;
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0px, 0px) scale(1)';
        });
    });
}

// Loading animations
function setupLoadingAnimations() {
    // Create loading spinner component
    function createSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner-ring">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        `;
        return spinner;
    }

    // Add to loading states
    window.showLoadingState = function() {
        const loadingElements = document.querySelectorAll('.data-loading');
        loadingElements.forEach(el => {
            if (!el.querySelector('.loading-spinner')) {
                el.appendChild(createSpinner());
            }
            el.classList.add('loading');
        });
    };

    window.hideLoadingState = function() {
        const loadingElements = document.querySelectorAll('.data-loading');
        loadingElements.forEach(el => {
            const spinner = el.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
            el.classList.remove('loading');
        });
    };
}

// Counter animations with easing
function setupCounterAnimations() {
    const counters = document.querySelectorAll('.stat-number');
    
    const animateCounter = (element) => {
        const target = parseInt(element.dataset.target);
        const duration = 2000;
        const start = performance.now();
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out-cubic)
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            const current = target * easedProgress;
            
            if (target >= 1000000) {
                element.textContent = (current / 1000000).toFixed(1) + 'M';
            } else if (target >= 1000) {
                element.textContent = (current / 1000).toFixed(1) + 'K';
            } else {
                element.textContent = Math.floor(current);
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }
        
        requestAnimationFrame(updateCounter);
    };

    // Observe counters
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                animateCounter(entry.target);
                entry.target.dataset.animated = 'true';
            }
        });
    });

    counters.forEach(counter => counterObserver.observe(counter));
}

// Parallax effects
function setupParallaxEffects() {
    const parallaxElements = document.querySelectorAll('.parallax-element');
    
    function updateParallax() {
        const scrollY = window.pageYOffset;
        
        parallaxElements.forEach(element => {
            const rate = scrollY * -0.5;
            element.style.transform = `translateY(${rate}px)`;
        });
    }
    
    // Throttled scroll handler
    let ticking = false;
    function handleScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateParallax();
                ticking = false;
            });
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', handleScroll);
}

// Particle system for background effects
function setupParticleSystem() {
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    canvas.style.opacity = '0.6';
    
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2
        };
    }
    
    function initParticles() {
        for (let i = 0; i < 50; i++) {
            particles.push(createParticle());
        }
    }
    
    function updateParticles() {
        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        });
    }
    
    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 82, 255, ${particle.opacity})`;
            ctx.fill();
        });
        
        // Draw connections
        particles.forEach((particle, i) => {
            particles.slice(i + 1).forEach(otherParticle => {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.strokeStyle = `rgba(0, 82, 255, ${0.1 * (1 - distance / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            });
        });
    }
    
    function animate() {
        updateParticles();
        drawParticles();
        requestAnimationFrame(animate);
    }
    
    resizeCanvas();
    initParticles();
    animate();
    
    window.addEventListener('resize', resizeCanvas);
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Chart interactivity
function addChartInteractivity(canvas, data, padding, chartWidth, chartHeight, minPrice, priceRange) {
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    document.body.appendChild(tooltip);
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= padding && x <= padding + chartWidth && y >= padding && y <= padding + chartHeight) {
            // Find closest data point
            const dataIndex = Math.round(((x - padding) / chartWidth) * (data.length - 1));
            const point = data[dataIndex];
            
            if (point) {
                tooltip.style.display = 'block';
                tooltip.style.left = e.clientX + 10 + 'px';
                tooltip.style.top = e.clientY - 10 + 'px';
                tooltip.innerHTML = `
                    <div class="tooltip-time">${new Date(point.time).toLocaleTimeString()}</div>
                    <div class="tooltip-price">${formatPrice(point.price)}</div>
                `;
            }
        } else {
            tooltip.style.display = 'none';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
}

// Utility functions for animations
function updateChartSettings() {
    // Update charts with new settings
    const indicators = AppState.userPreferences.chartSettings.indicators.map(type => ({ type }));
    
    const canvas = document.getElementById('tradingChart');
    if (canvas && AppState.cryptoData.bitcoin) {
        const mockData = generateMockData();
        createAdvancedChart(canvas, mockData, indicators);
    }
}

function updateCharts() {
    updateChartSettings();
}

// Real-time data simulation
function initRealTimeData() {
    // Simulate real-time price updates
    const priceElements = document.querySelectorAll('.price-value, .price');
    const changeElements = document.querySelectorAll('.price-change, .change');
    
    setInterval(() => {
        priceElements.forEach(element => {
            if (element.textContent.includes('$')) {
                const currentPrice = parseFloat(element.textContent.replace(/[$,]/g, ''));
                const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
                const newPrice = currentPrice * (1 + variation);
                element.textContent = '$' + newPrice.toFixed(2);
                
                // Update color based on change
                if (variation > 0) {
                    element.classList.add('positive');
                    element.classList.remove('negative');
                } else {
                    element.classList.add('negative');
                    element.classList.remove('positive');
                }
            }
        });
    }, 3000); // Update every 3 seconds
}

// Initialize interactive charts
function initCharts() {
    // Hero Chart - Bitcoin price chart
    const heroCanvas = document.getElementById('heroChart');
    if (heroCanvas && typeof Chart !== 'undefined') {
        createLiveChart(heroCanvas, 'hero', 'bitcoin');
    }
    
    // Market Chart - Market overview
    const marketCanvas = document.getElementById('marketChart');
    if (marketCanvas && typeof Chart !== 'undefined') {
        createLiveChart(marketCanvas, 'market', 'bitcoin');
    }
    
    // Portfolio Allocation Chart
    const allocationCanvas = document.getElementById('allocationChart');
    if (allocationCanvas && typeof Chart !== 'undefined') {
        createPortfolioChart(allocationCanvas);
    }
    
    console.log('📈 Charts initialized with live data capability');
}

// Create live updating chart
function createLiveChart(canvas, chartType, cryptoId) {
    const ctx = canvas.getContext('2d');
    
    // Generate historical data for the chart
    const chartData = generateHistoricalData(cryptoId);
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: `${cryptoId.toUpperCase()} Price`,
                data: chartData.prices,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartType === 'market'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#2563eb',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: chartType === 'market',
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: chartType === 'market',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
    
    // Store chart reference for updates
    AppState.charts[chartType] = chart;
    return chart;
}

// Generate realistic historical data
function generateHistoricalData(cryptoId) {
    const labels = [];
    const prices = [];
    const currentPrice = AppState.cryptoData[cryptoId]?.price || 50000;
    
    // Generate 30 days of data
    for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Generate realistic price movement
        const volatility = 0.05; // 5% daily volatility
        const trend = Math.sin(i * 0.1) * 0.02; // Slight trend
        const random = (Math.random() - 0.5) * volatility;
        const multiplier = 1 + trend + random;
        
        prices.push(currentPrice * multiplier * (0.9 + Math.random() * 0.2));
    }
    
    return { labels, prices };
}

// Create portfolio allocation chart
function createPortfolioChart(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Portfolio allocation data
    const portfolioData = {
        labels: ['Bitcoin', 'Ethereum', 'Cardano', 'Solana', 'Others'],
        datasets: [{
            data: [45, 30, 10, 10, 5], // Percentages
            backgroundColor: [
                '#f7931a', // Bitcoin orange
                '#627eea', // Ethereum blue
                '#3468dc', // Cardano blue
                '#14f195', // Solana green
                '#8b5cf6'  // Others purple
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    };
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: portfolioData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
    
    AppState.charts.portfolio = chart;
    return chart;
}

// Update charts with fresh data
function updateCharts() {
    if (!AppState.cryptoData.bitcoin) return;
    
    // Update hero chart
    if (AppState.charts.hero) {
        const newData = generateHistoricalData('bitcoin');
        AppState.charts.hero.data.labels = newData.labels;
        AppState.charts.hero.data.datasets[0].data = newData.prices;
        AppState.charts.hero.update('none');
    }
    
    // Update market chart
    if (AppState.charts.market) {
        const newData = generateHistoricalData('bitcoin');
        AppState.charts.market.data.labels = newData.labels;
        AppState.charts.market.data.datasets[0].data = newData.prices;
        AppState.charts.market.update('none');
    }
    
    console.log('📊 Charts updated with live data');
}

// Portfolio Management Functions
function calculatePortfolioValue() {
    let totalValue = 0;
    let totalChange24h = 0;
    const holdings = AppState.portfolio.holdings;
    
    // Calculate total portfolio value using live prices
    Object.keys(holdings).forEach(cryptoId => {
        const holding = holdings[cryptoId];
        const cryptoData = AppState.cryptoData[cryptoId];
        
        if (cryptoData && holding.amount > 0) {
            const currentValue = holding.amount * cryptoData.price;
            const change24h = currentValue * (cryptoData.change / 100);
            
            totalValue += currentValue;
            totalChange24h += change24h;
            
            // Update individual holding values
            holding.currentPrice = cryptoData.price;
            holding.value = currentValue;
            holding.change24h = cryptoData.change;
        }
    });
    
    AppState.portfolio.totalValue = totalValue;
    AppState.portfolio.totalChange24h = totalChange24h;
    AppState.portfolio.lastUpdated = new Date();
    
    console.log('💰 Portfolio calculated:', {
        totalValue: totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        change24h: totalChange24h.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    });
    
    return {
        totalValue,
        totalChange24h,
        changePercent: totalValue > 0 ? (totalChange24h / (totalValue - totalChange24h)) * 100 : 0
    };
}

// Update portfolio displays in UI
function updatePortfolioDisplays() {
    const portfolio = calculatePortfolioValue();
    
    // Update total portfolio value
    const valueElement = document.querySelector('.portfolio-value .value');
    const changeElement = document.querySelector('.portfolio-value .change');
    
    if (valueElement) {
        valueElement.textContent = portfolio.totalValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        });
    }
    
    if (changeElement) {
        const changeText = `${portfolio.totalChange24h >= 0 ? '+' : ''}${portfolio.totalChange24h.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD' 
        })} (${portfolio.changePercent >= 0 ? '+' : ''}${portfolio.changePercent.toFixed(2)}%)`;
        
        changeElement.textContent = changeText;
        changeElement.className = `change ${portfolio.totalChange24h >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Update individual holding rows
    updateHoldingRows();
    
    // Update allocation percentages
    updateAllocationPercentages();
    
    // Log portfolio status for debugging
    logPortfolioStatus();
}

// Update individual holding rows in the table
function updateHoldingRows() {
    const tableRows = document.querySelectorAll('.table-row');
    
    tableRows.forEach(row => {
        const assetSymbol = row.querySelector('.asset-symbol')?.textContent;
        if (!assetSymbol) return;
        
        // Map symbols to crypto IDs
        const cryptoMap = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum', 
            'ADA': 'cardano',
            'SOL': 'solana'
        };
        
        const cryptoId = cryptoMap[assetSymbol];
        const holding = AppState.portfolio.holdings[cryptoId];
        const cryptoData = AppState.cryptoData[cryptoId];
        
        if (holding && cryptoData) {
            // Update price
            const priceElement = row.querySelector('.price');
            if (priceElement) {
                priceElement.textContent = cryptoData.price.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2
                });
            }
            
            // Update 24h change
            const changeElement = row.querySelector('.change');
            if (changeElement) {
                changeElement.textContent = `${cryptoData.change >= 0 ? '+' : ''}${cryptoData.change.toFixed(2)}%`;
                changeElement.className = `change ${cryptoData.change >= 0 ? 'positive' : 'negative'}`;
            }
            
            // Update value
            const valueElement = row.querySelector('.value');
            if (valueElement) {
                const totalValue = holding.amount * cryptoData.price;
                valueElement.textContent = totalValue.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2
                });
            }
        }
    });
}

// Update allocation percentages
function updateAllocationPercentages() {
    const totalValue = AppState.portfolio.totalValue;
    if (totalValue === 0) return;
    
    const legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
        const text = item.textContent;
        if (text.includes('Bitcoin')) {
            const btcValue = (AppState.portfolio.holdings.bitcoin?.amount || 0) * (AppState.cryptoData.bitcoin?.price || 0);
            const percentage = ((btcValue / totalValue) * 100).toFixed(0);
            item.innerHTML = `<span class="color-dot" style="background: #f7931a;"></span><span>Bitcoin (${percentage}%)</span>`;
        } else if (text.includes('Ethereum')) {
            const ethValue = (AppState.portfolio.holdings.ethereum?.amount || 0) * (AppState.cryptoData.ethereum?.price || 0);
            const percentage = ((ethValue / totalValue) * 100).toFixed(0);
            item.innerHTML = `<span class="color-dot" style="background: #627eea;"></span><span>Ethereum (${percentage}%)</span>`;
        }
    });
}

// Add portfolio interaction handlers
function initPortfolioHandlers() {
    // Add handlers for buy/sell buttons
    const actionButtons = document.querySelectorAll('.btn-icon');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const row = this.closest('.table-row');
            const assetSymbol = row.querySelector('.asset-symbol')?.textContent;
            const isAdd = this.querySelector('i').classList.contains('fa-plus');
            
            if (assetSymbol) {
                handlePortfolioAction(assetSymbol, isAdd);
            }
        });
    });
    
    console.log('💼 Portfolio handlers initialized');
}

// Handle buy/sell actions
function handlePortfolioAction(symbol, isAdd) {
    const cryptoMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum', 
        'ADA': 'cardano',
        'SOL': 'solana'
    };
    
    const cryptoId = cryptoMap[symbol];
    if (!cryptoId || !AppState.portfolio.holdings[cryptoId]) return;
    
    const holding = AppState.portfolio.holdings[cryptoId];
    const currentPrice = AppState.cryptoData[cryptoId]?.price || 0;
    
    if (isAdd) {
        // Simulate buying $100 worth
        const amountToBuy = 100 / currentPrice;
        holding.amount += amountToBuy;
        console.log(`💰 Bought ${amountToBuy.toFixed(6)} ${symbol} for $100`);
    } else {
        // Simulate selling 10% of holdings
        const amountToSell = holding.amount * 0.1;
        holding.amount = Math.max(0, holding.amount - amountToSell);
        console.log(`💸 Sold ${amountToSell.toFixed(6)} ${symbol}`);
    }
    
    // Update displays immediately
    updatePortfolioDisplays();
    
    // Update charts if needed
    if (AppState.charts.portfolio) {
        updatePortfolioChart();
    }
}

// Update portfolio allocation chart
function updatePortfolioChart() {
    const chart = AppState.charts.portfolio;
    if (!chart) return;
    
    const totalValue = AppState.portfolio.totalValue;
    if (totalValue === 0) return;
    
    const btcValue = (AppState.portfolio.holdings.bitcoin?.amount || 0) * (AppState.cryptoData.bitcoin?.price || 0);
    const ethValue = (AppState.portfolio.holdings.ethereum?.amount || 0) * (AppState.cryptoData.ethereum?.price || 0);
    const adaValue = (AppState.portfolio.holdings.cardano?.amount || 0) * (AppState.cryptoData.cardano?.price || 0);
    const solValue = (AppState.portfolio.holdings.solana?.amount || 0) * (AppState.cryptoData.solana?.price || 0);
    const othersValue = totalValue - btcValue - ethValue - adaValue - solValue;
    
    const newData = [
        (btcValue / totalValue) * 100,
        (ethValue / totalValue) * 100,
        (adaValue / totalValue) * 100,
        (solValue / totalValue) * 100,
        Math.max(0, (othersValue / totalValue) * 100)
    ];
    
    chart.data.datasets[0].data = newData;
    chart.update('none');
}

// Get portfolio performance summary
function getPortfolioSummary() {
    const portfolio = AppState.portfolio;
    const summary = {
        totalAssets: Object.keys(portfolio.holdings).length,
        totalValue: portfolio.totalValue,
        change24h: portfolio.totalChange24h,
        changePercent: portfolio.totalValue > 0 ? (portfolio.totalChange24h / (portfolio.totalValue - portfolio.totalChange24h)) * 100 : 0,
        topPerformer: null,
        worstPerformer: null
    };
    
    // Find best and worst performers
    let bestChange = -Infinity;
    let worstChange = Infinity;
    
    Object.keys(portfolio.holdings).forEach(cryptoId => {
        const cryptoData = AppState.cryptoData[cryptoId];
        if (cryptoData) {
            if (cryptoData.change > bestChange) {
                bestChange = cryptoData.change;
                summary.topPerformer = { id: cryptoId, change: cryptoData.change };
            }
            if (cryptoData.change < worstChange) {
                worstChange = cryptoData.change;
                summary.worstPerformer = { id: cryptoId, change: cryptoData.change };
            }
        }
    });
    
    return summary;
}

// Log portfolio status (for debugging)
function logPortfolioStatus() {
    const summary = getPortfolioSummary();
    console.log('📊 Portfolio Summary:', {
        totalValue: summary.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        change24h: `${summary.changePercent >= 0 ? '+' : ''}${summary.changePercent.toFixed(2)}%`,
        topPerformer: summary.topPerformer ? `${summary.topPerformer.id} (+${summary.topPerformer.change.toFixed(2)}%)` : 'None',
        worstPerformer: summary.worstPerformer ? `${summary.worstPerformer.id} (${summary.worstPerformer.change.toFixed(2)}%)` : 'None'
    });
}

// Generate mock trading data
function generateMockData() {
    const data = [];
    let price = 67000;
    const now = new Date();
    
    for (let i = 100; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000); 
        price += (Math.random() - 0.5) * 1000; 
        data.push({
            time: time,
            price: Math.max(price, 50000), 
            volume: Math.random() * 100
        });
    }
    
    return data;
}

// Create trading chart 
function createTradingChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set up chart area
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Find min/max prices
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices) * 0.99;
    const maxPrice = Math.max(...prices) * 1.01;
    const priceRange = maxPrice - minPrice;
    
    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Price labels
        const price = maxPrice - (priceRange / 5) * i;
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText('$' + price.toFixed(0), padding - 10, y + 4);
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
        const x = padding + (chartWidth / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    // Draw price line
    ctx.strokeStyle = '#0052ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Add gradient fill
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(0, 82, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 82, 255, 0.0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
}

// Create line chart
function createLineChart(canvas, data) {
    createTradingChart(canvas, data); 
}

// Create pie chart for portfolio allocation
function createPieChart(canvas) {
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    const data = [
        { label: 'Bitcoin', value: 45, color: '#f7931a' },
        { label: 'Ethereum', value: 30, color: '#627eea' },
        { label: 'Others', value: 25, color: '#00d4aa' }
    ];
    
    let currentAngle = -Math.PI / 2; // Start at top
    
    data.forEach(segment => {
        const sliceAngle = (segment.value / 100) * 2 * Math.PI;
        
        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = segment.color;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });
}

// Animation counter for stats
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (target - start) * easeOutQuart(progress);
        
        if (target > 1000) {
            element.textContent = (current / 1000000).toFixed(1) + 'M';
        } else {
            element.textContent = current.toFixed(0);
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Easing function
function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

// Navigation functionality
function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navList = document.querySelector('.nav-list');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger && navList) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navList.classList.toggle('active');
        });

        // Close menu when clicking on nav links
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navList.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
            
            if (window.scrollY > 100) {
                if (isDarkTheme) {
                    navbar.style.background = 'rgba(15, 23, 42, 0.98)';
                } else {
                    navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                }
                navbar.style.backdropFilter = 'blur(20px)';
            } else {
                if (isDarkTheme) {
                    navbar.style.background = 'rgba(15, 23, 42, 0.95)';
                } else {
                    navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                }
                navbar.style.backdropFilter = 'blur(20px)';
            }
        });
    }
}

// Animation system
function initAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .analytics-card, .portfolio-card, .section-header');
    animatedElements.forEach(el => observer.observe(el));

    // Counter animations
    animateCounters();
}

// Counter animations for statistics
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number, .analytics-value');
    
    counters.forEach(counter => {
        const target = parseInt(counter.innerText.replace(/[^\d]/g, ''));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;
        
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.innerText = formatNumber(Math.floor(current));
                requestAnimationFrame(updateCounter);
            } else {
                counter.innerText = formatNumber(target);
            }
        };
        
        // Start animation when element is visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        });
        
        observer.observe(counter);
    });
}

// Format numbers with appropriate suffixes
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Trading terminal functionality
function initTradingTerminal() {
    // Simulate real-time price updates
    const priceElements = document.querySelectorAll('.price-value');
    const changeElements = document.querySelectorAll('.price-change');
    
    if (priceElements.length > 0) {
        setInterval(() => {
            priceElements.forEach((priceEl, index) => {
                const currentPrice = parseFloat(priceEl.innerText.replace('$', '').replace(',', ''));
                const change = (Math.random() - 0.5) * 0.02; // ±1% change
                const newPrice = currentPrice * (1 + change);
                
                priceEl.innerText = '$' + newPrice.toFixed(2);
                
                // Update change indicator
                if (changeElements[index]) {
                    const changePercent = (change * 100).toFixed(2);
                    changeElements[index].innerText = (change >= 0 ? '+' : '') + changePercent + '%';
                    changeElements[index].className = change >= 0 ? 'price-change positive' : 'price-change negative';
                }
            });
        }, 3000); // Update every 3 seconds
    }

    // Terminal tabs functionality
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

// Portfolio management
function initPortfolio() {
    // Simulate portfolio updates
    const assetValues = document.querySelectorAll('.asset-value');
    const assetChanges = document.querySelectorAll('.asset-change');
    
    if (assetValues.length > 0) {
        setInterval(() => {
            assetValues.forEach((valueEl, index) => {
                const currentValue = parseFloat(valueEl.innerText.replace('$', '').replace(',', ''));
                const change = (Math.random() - 0.5) * 0.03; // ±1.5% change
                const newValue = currentValue * (1 + change);
                
                valueEl.innerText = '$' + newValue.toFixed(2);
                
                if (assetChanges[index]) {
                    const changePercent = (change * 100).toFixed(2);
                    assetChanges[index].innerText = (change >= 0 ? '+' : '') + changePercent + '%';
                    assetChanges[index].className = change >= 0 ? 'asset-change positive' : 'asset-change negative';
                }
            });
        }, 5000); // Update every 5 seconds
    }
}

// Analytics dashboard
function initAnalytics() {
    // Simulate analytics data updates
    const analyticsValues = document.querySelectorAll('.analytics-value');
    
    if (analyticsValues.length > 0) {
        setInterval(() => {
            analyticsValues.forEach(valueEl => {
                const currentValue = parseInt(valueEl.innerText.replace(/[^\d]/g, ''));
                const change = Math.floor((Math.random() - 0.5) * 100);
                const newValue = Math.max(0, currentValue + change);
                
                valueEl.innerText = formatNumber(newValue);
            });
        }, 10000); // Update every 10 seconds
    }
}

// Contact form functionality
function initContactForm() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            // Validate form
            if (!name || !email || !message) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Simulate form submission
            const submitBtn = contactForm.querySelector('.btn-primary');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Sending...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                showNotification('Message sent successfully!', 'success');
                contactForm.reset();
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }, 2000);
        });
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 1rem;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: 0.5rem;
    `;
    
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    });
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Theme system (light/dark mode)
function initTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (themeToggle) {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

console.log('CryptoDash Professional Platform Loaded ⚡');
// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Performance optimization
const optimizedScrollHandler = throttle(() => {
    // Handle scroll events efficiently
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.parallax');
    
    parallaxElements.forEach(element => {
        const speed = element.dataset.speed || 0.5;
        const yPos = -(scrolled * speed);
        element.style.transform = `translateY(${yPos}px)`;
    });
}, 16); // ~60fps

window.addEventListener('scroll', optimizedScrollHandler);

// Error handling
window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
    // Optionally send error to analytics service
});

// Service worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Advanced features for professional trading platform
class ChartManager {
    constructor() {
        this.charts = new Map();
        this.websocket = null;
        this.isConnected = false;
    }

    initializeCharts() {
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            this.createChart(container);
        });
    }

    createChart(container) {
        // Simulate chart creation 
        const mockData = this.generateMockData();
        this.renderSimpleChart(container, mockData);
    }

    generateMockData() {
        const data = [];
        let price = 100;
        
        for (let i = 0; i < 50; i++) {
            price += (Math.random() - 0.5) * 5;
            data.push({
                time: new Date(Date.now() - (50 - i) * 60000),
                price: Math.max(price, 10)
            });
        }
        
        return data;
    }

    renderSimpleChart(container, data) {
        const canvas = document.createElement('canvas');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight || 200;
        
        const ctx = canvas.getContext('2d');
        const padding = 20;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        
        // Find min/max prices
        const prices = data.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // Draw chart background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw price line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = padding + ((maxPrice - point.price) / priceRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Add gradient fill
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        container.appendChild(canvas);
    }
}

// Initialize chart manager
const chartManager = new ChartManager();

// Data management for real-time updates
class DataManager {
    constructor() {
        this.cache = new Map();
        this.updateInterval = 1000; 
        this.isUpdating = false;
    }

    startRealTimeUpdates() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        this.updateLoop();
    }

    stopRealTimeUpdates() {
        this.isUpdating = false;
    }

    updateLoop() {
        if (!this.isUpdating) return;
        
        this.updatePrices();
        this.updatePortfolio();
        this.updateAnalytics();
        
        setTimeout(() => this.updateLoop(), this.updateInterval);
    }

    updatePrices() {
        const priceElements = document.querySelectorAll('[data-symbol]');
        priceElements.forEach(element => {
            const symbol = element.dataset.symbol;
            const currentPrice = this.cache.get(symbol) || 100;
            const change = (Math.random() - 0.5) * 0.02;
            const newPrice = currentPrice * (1 + change);
            
            this.cache.set(symbol, newPrice);
            element.textContent = `$${newPrice.toFixed(2)}`;
        });
    }

    updatePortfolio() {
        // Update portfolio values based on price changes
        const portfolioValue = document.querySelector('.portfolio-value');
        if (portfolioValue) {
            const currentValue = parseFloat(portfolioValue.textContent.replace(/[$,]/g, ''));
            const change = (Math.random() - 0.5) * 0.01;
            const newValue = currentValue * (1 + change);
            portfolioValue.textContent = `$${newValue.toLocaleString()}`;
        }
    }

    updateAnalytics() {
        // Update analytics metrics
        const analyticsElements = document.querySelectorAll('.analytics-value[data-metric]');
        analyticsElements.forEach(element => {
            const metric = element.dataset.metric;
            const currentValue = parseInt(element.textContent.replace(/[^\d]/g, ''));
            const change = Math.floor((Math.random() - 0.5) * 50);
            const newValue = Math.max(0, currentValue + change);
            element.textContent = formatNumber(newValue);
        });
    }
}

// Initialize data manager
const dataManager = new DataManager();

// Additional initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    chartManager.initializeCharts();
    dataManager.startRealTimeUpdates();
});

function activateHyperMode() {
    document.body.style.animation = 'hyperShake 0.5s ease-in-out 0s 20';
    showNotification('🔥 HYPER MODE! TO THE MOON! 🚀🌙');
    
    // Add CSS for hyper shake
    const style = document.createElement('style');
    style.textContent = `
        @keyframes hyperShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px) rotate(1deg); }
            75% { transform: translateX(5px) rotate(-1deg); }
        }
    `;
    document.head.appendChild(style);
}

// Particle Effects
function initializeParticleEffects() {
    const buttons = document.querySelectorAll('.cta-btn, .buy-btn, .social-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            createParticleExplosion(e.pageX, e.pageY);
        });
    });
}

function createParticleExplosion(x, y) {
    const particles = ['🚀', '💎', '⭐', '💰', '🔥', '🌙'];
    
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.textContent = particles[Math.floor(Math.random() * particles.length)];
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.fontSize = '20px';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        
        const angle = (Math.PI * 2 * i) / 15;
        const velocity = Math.random() * 100 + 50;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        particle.style.animation = `particleExplode 1s ease-out forwards`;
        particle.style.setProperty('--vx', vx + 'px');
        particle.style.setProperty('--vy', vy + 'px');
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1000);
    }
    
    // Add CSS for particle explosion
    const style = document.createElement('style');
    style.textContent = `
        @keyframes particleExplode {
            0% {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translate(var(--vx), var(--vy)) scale(0);
                opacity: 0;
            }
        }
    `;
    if (!document.querySelector('style[data-particles]')) {
        style.setAttribute('data-particles', 'true');
        document.head.appendChild(style);
    }
}

function createExplosion(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    createParticleExplosion(x, y);
}

// Sound Effects (Visual feedback)
function initializeSoundEffects() {
    // Copy button functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-copy');
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.textContent = '✅';
                showNotification('Address copied! Much convenient!');
                setTimeout(() => {
                    this.textContent = '📋';
                }, 2000);
            });
        });
    });
    
    // Buy button effects
    document.querySelectorAll('.buy-btn, .primary-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showNotification('🚀 TO THE MOON! (This is a demo)');
            createParticleExplosion(
                this.getBoundingClientRect().left + this.offsetWidth / 2,
                this.getBoundingClientRect().top + this.offsetHeight / 2
            );
        });
    });
}

// Notification system
function showNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #ff6b6b, #ffa726);
        color: white;
        padding: 1rem 2rem;
        border-radius: 25px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.5s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease-in forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
    
    // Add notification animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    
    if (!document.querySelector('style[data-notifications]')) {
        style.setAttribute('data-notifications', 'true');
        document.head.appendChild(style);
    }
}

// Random price updates
function startPriceUpdates() {
    const priceElement = document.querySelector('.price');
    const marketCapElement = document.querySelector('.market-cap');
    const holdersElement = document.querySelector('.holders');
    
    setInterval(() => {
        // Random price change
        const basePrice = 0.00000420;
        const change = (Math.random() - 0.5) * 0.00000100;
        const newPrice = Math.max(0.00000001, basePrice + change);
        const percentage = ((change / basePrice) * 100).toFixed(2);
        const isPositive = change >= 0;
        
        if (priceElement) {
            priceElement.innerHTML = `$MOONDOG: $${newPrice.toFixed(8)} ${isPositive ? '📈 +' : '📉 '}${Math.abs(percentage)}%`;
        }
        
        // Random market cap update
        if (marketCapElement) {
            const baseMcap = 42069000;
            const mcapChange = (Math.random() - 0.5) * 5000000;
            const newMcap = Math.max(1000000, baseMcap + mcapChange);
            marketCapElement.textContent = `Market Cap: $${Math.floor(newMcap).toLocaleString()}`;
        }
        
        // Random holders update
        if (holdersElement) {
            const baseHolders = 13337;
            const holderChange = Math.floor((Math.random() - 0.3) * 100);
            const newHolders = Math.max(1000, baseHolders + holderChange);
            holdersElement.textContent = `Holders: ${newHolders.toLocaleString()}`;
        }
    }, 5000);
}

// Start price updates
setTimeout(startPriceUpdates, 2000);

// Mobile menu toggle (for responsive design)
function initializeMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.innerHTML = '☰';
    mobileMenuBtn.className = 'mobile-menu-btn';
    mobileMenuBtn.style.cssText = `
        display: none;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
    `;
    
    document.querySelector('.navbar').appendChild(mobileMenuBtn);
    
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
    });
    
    // Add mobile styles
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .mobile-menu-btn {
                display: block !important;
            }
            
            .nav-links {
                position: fixed;
                top: 0;
                right: -100%;
                width: 80%;
                height: 100vh;
                background: rgba(0, 0, 0, 0.9);
                flex-direction: column;
                justify-content: center;
                transition: right 0.3s ease;
                z-index: 1000;
            }
            
            .nav-links.mobile-open {
                right: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

initializeMobileMenu();

// Add some fun random events
setInterval(() => {
    if (Math.random() < 0.1) { 
        const messages = [
            '🚀 Someone just bought MOONDOG!',
            '💎 Diamond paws detected!',
            '🌙 Moon mission in progress...',
            '🔥 MOONDOG is trending!',
            '⭐ New holder joined the pack!',
            '📈 Price go brrr!'
        ];
        showNotification(messages[Math.floor(Math.random() * messages.length)]);
    }
}, 30000);

console.log('🐕 MOONDOG WEBSITE LOADED! Much wow! Very interactive! 🚀');
