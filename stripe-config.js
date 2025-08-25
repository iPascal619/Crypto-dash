// Stripe Configuration for CryptoDash
// This file contains the publishable key for frontend Stripe integration

const stripeConfig = {
    publishableKey: "pk_test_51RwPDz1ZuHrxnQx58hPonaX1Hjn97AS5yDt6KjIeLjrRGBvQ2O74AjSYyb1Kd5VBwQzdBVL5E0zC05Z6kIOJiTZU00eNpL4coa", 
    currency: "USD",
    appearance: {
        theme: 'night', 
        variables: {
            colorPrimary: '#0052ff',
            colorBackground: '#1a1a1a',
            colorText: '#ffffff',
            colorDanger: '#df1b41',
            borderRadius: '8px',
            fontFamily: 'Inter, system-ui, sans-serif',
        }
    },
    locale: 'en'
};

// Initialize Stripe only when Stripe library is available
let stripe = null;

function initializeStripe() {
    try {
        if (typeof Stripe !== 'undefined' && stripeConfig.publishableKey !== "pk_test_your_stripe_publishable_key_here") {
            stripe = Stripe(stripeConfig.publishableKey);
            console.log('💳 Stripe initialized successfully');
            return stripe;
        } else if (stripeConfig.publishableKey === "pk_test_your_stripe_publishable_key_here") {
            console.warn('⚠️ Stripe publishable key not configured. Payment forms will use demo mode.');
            return null;
        }
        return null;
    } catch (error) {
        console.error('Stripe initialization error:', error);
        return null;
    }
}

// Payment methods configuration
const paymentMethodsConfig = {
    supportedTypes: ['card', 'us_bank_account'],
    cardBrands: ['visa', 'mastercard', 'amex', 'discover'],
    currencies: ['usd', 'eur', 'gbp', 'cad', 'aud'],
    limits: {
        min: 10, // $10 minimum
        max: 50000, // $50,000 maximum
        daily: 25000, // $25,000 daily limit
        monthly: 100000 // $100,000 monthly limit
    },
    fees: {
        card: 0.029, // 2.9% + 30¢
        bank_account: 0.008, // 0.8%
        wire_transfer: 15 // $15 flat fee
    }
};

// Demo mode configuration
const demoConfig = {
    enabled: true, // Set to false when using real Stripe keys
    testCards: {
        visa: '4242424242424242',
        visaDebit: '4000056655665556',
        mastercard: '5555555555554444',
        amex: '378282246310005',
        declined: '4000000000000002',
        insufficient: '4000000000009995'
    },
    testExpiry: '12/34',
    testCvv: '123'
};

// Export configuration
window.stripeConfig = stripeConfig;
window.paymentMethodsConfig = paymentMethodsConfig;
window.demoConfig = demoConfig;
window.initializeStripe = initializeStripe;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeStripe();
});
