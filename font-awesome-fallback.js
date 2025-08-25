// Font Awesome Fallback Script
// This script provides fallback icons if Font Awesome fails to load

(function() {
    'use strict';
    
    // Check if Font Awesome loaded
    function checkFontAwesome() {
        const testEl = document.createElement('i');
        testEl.className = 'fas fa-home';
        testEl.style.display = 'none';
        document.body.appendChild(testEl);
        
        const computed = window.getComputedStyle(testEl, ':before');
        const content = computed.getPropertyValue('content');
        
        document.body.removeChild(testEl);
        
        return content && content !== 'none' && content !== '""';
    }
    
    // CSS fallback icons using Unicode symbols
    const fallbackCSS = `
        .fa-fallback {
            font-family: inherit !important;
            font-style: normal !important;
            font-weight: normal !important;
            display: inline-block !important;
        }
        
        /* Navigation Icons */
        .fas.fa-home.fa-fallback:before { content: "🏠"; }
        .fas.fa-chart-line.fa-fallback:before { content: "📈"; }
        .fas.fa-wallet.fa-fallback:before { content: "💰"; }
        .fas.fa-exchange-alt.fa-fallback:before { content: "🔄"; }
        .fas.fa-history.fa-fallback:before { content: "🕐"; }
        .fas.fa-cog.fa-fallback:before { content: "⚙️"; }
        .fas.fa-shield-alt.fa-fallback:before { content: "🛡️"; }
        .fas.fa-user.fa-fallback:before { content: "👤"; }
        .fas.fa-sign-out-alt.fa-fallback:before { content: "🚪"; }
        .fas.fa-bell.fa-fallback:before { content: "🔔"; }
        .fas.fa-bars.fa-fallback:before { content: "☰"; }
        
        /* Crypto Icons */
        .fab.fa-bitcoin.fa-fallback:before { content: "₿"; }
        .fab.fa-ethereum.fa-fallback:before { content: "⧫"; }
        
        /* UI Icons */
        .fas.fa-eye.fa-fallback:before { content: "👁"; }
        .fas.fa-eye-slash.fa-fallback:before { content: "👁"; }
        .fas.fa-times.fa-fallback:before { content: "✕"; }
        .fas.fa-plus.fa-fallback:before { content: "+"; }
        .fas.fa-minus.fa-fallback:before { content: "−"; }
        .fas.fa-check.fa-fallback:before { content: "✓"; }
        .fas.fa-arrow-up.fa-fallback:before { content: "↑"; }
        .fas.fa-arrow-down.fa-fallback:before { content: "↓"; }
        .fas.fa-sun.fa-fallback:before { content: "☀"; }
        .fas.fa-moon.fa-fallback:before { content: "🌙"; }
        
        /* Social Icons */
        .fab.fa-google.fa-fallback:before { content: "G"; }
        .fab.fa-microsoft.fa-fallback:before { content: "M"; }
        .fab.fa-facebook.fa-fallback:before { content: "f"; }
        .fab.fa-twitter.fa-fallback:before { content: "t"; }
        
        /* File Icons */
        .fas.fa-download.fa-fallback:before { content: "⬇"; }
        .fas.fa-upload.fa-fallback:before { content: "⬆"; }
        .fas.fa-file-pdf.fa-fallback:before { content: "📄"; }
        .fas.fa-image.fa-fallback:before { content: "🖼"; }
        
        /* Security Icons */
        .fas.fa-shield-check.fa-fallback:before { content: "🛡"; }
        .fas.fa-lock.fa-fallback:before { content: "🔒"; }
        .fas.fa-unlock.fa-fallback:before { content: "🔓"; }
        .fas.fa-key.fa-fallback:before { content: "🔑"; }
        
        /* Device Icons */
        .fas.fa-mobile-alt.fa-fallback:before { content: "📱"; }
        .fas.fa-desktop.fa-fallback:before { content: "🖥"; }
        .fas.fa-tablet.fa-fallback:before { content: "📱"; }
    `;
    
    function addFallbackCSS() {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = fallbackCSS;
        document.head.appendChild(style);
    }
    
    function applyFallback() {
        // Add fallback class to all Font Awesome icons
        const icons = document.querySelectorAll('.fas, .fab, .far, .fal');
        icons.forEach(icon => {
            icon.classList.add('fa-fallback');
        });
        
        console.log('Font Awesome fallback applied to', icons.length, 'icons');
    }
    
    // Check Font Awesome loading after page load
    function initFallback() {
        // Wait a bit for Font Awesome to load
        setTimeout(() => {
            if (!checkFontAwesome()) {
                console.warn('Font Awesome not detected, applying fallback icons');
                addFallbackCSS();
                applyFallback();
                
                // Also watch for dynamically added icons
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element node
                                const newIcons = node.querySelectorAll?.('.fas, .fab, .far, .fal') || [];
                                newIcons.forEach(icon => {
                                    icon.classList.add('fa-fallback');
                                });
                            }
                        });
                    });
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            } else {
                console.log('Font Awesome loaded successfully');
            }
        }, 2000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFallback);
    } else {
        initFallback();
    }
    
    // Expose global function for manual fallback application
    window.applyIconFallback = function() {
        addFallbackCSS();
        applyFallback();
    };
    
})();
