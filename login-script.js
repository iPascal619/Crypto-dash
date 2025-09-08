// Professional Authentication System
class CryptoDashAuth {
    constructor() {
        this.currentUser = null;
        this.verificationId = null;
        this.resendTimer = null;
        this.init();
    }

    init() {
        console.log('🔐 CryptoDash Authentication System Initializing...');
        this.initializeElements();
        this.attachEventListeners();
        this.initializeFirebaseAuth();
        this.setupPasswordStrength();
        this.setupOTPInputs();
        
        // Ensure sign-in form is visible by default
        setTimeout(() => {
            this.switchForm('signin');
        }, 100);
    }

    initializeElements() {
        // Main forms
        this.signInForm = document.getElementById('signinForm');
        this.signUpForm = document.getElementById('signupForm');
        
        // Form elements
        this.forgotPasswordForm = document.getElementById('forgotPasswordForm');
        this.otpForm = document.getElementById('otpForm');
        this.phoneVerificationForm = document.getElementById('phoneVerificationForm');

        // Tab buttons
        this.tabButtons = document.querySelectorAll('.tab-btn');
        
        // Form switchers (backup for any existing links)
        this.showSignUp = document.getElementById('showSignUp');
        this.showSignIn = document.getElementById('showSignIn');
        this.forgotPasswordLink = document.getElementById('showForgotPassword');
        this.backToSignIn = document.getElementById('backToSignin');
        this.backToSignIn2 = document.getElementById('backToSignIn');

        // Buttons
        this.signInBtn = document.getElementById('signinBtn');
        this.signUpBtn = document.getElementById('signupBtn');
        this.resetPasswordBtn = document.getElementById('resetBtn');
        this.verifyOTPBtn = document.getElementById('verifyOTPBtn');
        this.resendOTPBtn = document.getElementById('resendOTP');

        // Social auth buttons
        this.googleSignIn = document.getElementById('googleSignin');
        this.googleSignUp = document.getElementById('googleSignup');
        this.microsoftSignIn = document.getElementById('microsoftSignin');
        this.microsoftSignUp = document.getElementById('microsoftSignup');

        // Header elements
        this.authTitle = document.getElementById('formTitle');
        this.authSubtitle = document.getElementById('formSubtitle');

        // Toast and modal
        this.toastContainer = document.getElementById('toastContainer');
        this.successModal = document.getElementById('successModal');
    }

    attachEventListeners() {
        // Form submissions
        this.signInForm?.addEventListener('submit', (e) => this.handleSignIn(e));
        this.signUpForm?.addEventListener('submit', (e) => this.handleSignUp(e));
        this.forgotPasswordForm?.addEventListener('submit', (e) => this.handleForgotPassword(e));
        this.otpForm?.addEventListener('submit', (e) => this.handleOTPVerification(e));
        this.phoneVerificationForm?.addEventListener('submit', (e) => this.handlePhoneVerification(e));

        // Tab buttons
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabType = button.getAttribute('data-tab');
                this.switchForm(tabType);
                this.updateTabButtons(button);
            });
        });

        // Form switchers (backup for any existing links)
        this.showSignUp?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('signup');
        });

        this.showSignIn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('signin');
        });

        this.forgotPasswordLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('forgotPassword');
        });

        this.backToSignIn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('signin');
        });

        this.backToSignIn2?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('signin');
        });

        // Social authentication
            this.googleSignIn?.addEventListener('click', (e) => {
                e.preventDefault();
                const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
                window.location.href = `${baseUrl}/api/auth/google/login`;
            });
            this.googleSignUp?.addEventListener('click', (e) => {
                e.preventDefault();
                const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
                window.location.href = `${baseUrl}/api/auth/google/login`;
            });
        this.microsoftSignIn?.addEventListener('click', () => this.handleSocialAuth('microsoft', 'signIn'));
        this.microsoftSignUp?.addEventListener('click', () => this.handleSocialAuth('microsoft', 'signUp'));

        // Password toggle
        document.querySelectorAll('.password-toggle').forEach(button => {
            button.addEventListener('click', () => this.togglePassword(button));
        });

        // OTP resend
        this.resendOTPBtn?.addEventListener('click', () => this.resendOTP());

        // Success modal continue
        document.getElementById('continueBtn')?.addEventListener('click', () => {
            // Hide the modal
            this.successModal?.classList.remove('show');
            this.redirectToDashboard();
        });
    }

    initializeFirebaseAuth() {
        // Check if Firebase is available before trying to use it
        if (typeof firebase === 'undefined') {
            console.log('⚠️ Firebase not available, using backend authentication only');
            return;
        }
        
        try {
            // Auth state listener (only track state, don't auto-handle success)
            firebase.auth().onAuthStateChanged((user) => {
                this.currentUser = user;
                if (user) {
                    console.log('User signed in:', user.email);
                    // Only handle auth success if it's from a direct login action
                    // NOT from page reload or initial state check
                } else {
                    console.log('User signed out');
                }
            });
        } catch (error) {
            console.error('Firebase auth error:', error);
            console.log('⚠️ Using backend authentication only');
        }

        // Configure reCAPTCHA for phone verification
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'normal',
                'callback': (response) => {
                    console.log('reCAPTCHA solved');
                },
                'expired-callback': () => {
                    console.log('reCAPTCHA expired');
                    this.showToast('reCAPTCHA expired. Please try again.', 'error');
                }
            });
        }
    }

    updateTabButtons(activeButton) {
        // Remove active class from all tab buttons
        this.tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        // Add active class to clicked button
        activeButton.classList.add('active');
    }

    switchForm(formType) {
        // Hide all forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });

        // Update header and show target form
        switch(formType) {
            case 'signup':
                this.signUpForm?.classList.add('active');
                this.authTitle.textContent = 'Create Account';
                this.authSubtitle.textContent = 'Join thousands of professional traders worldwide';
                break;
            case 'signin':
                this.signInForm?.classList.add('active');
                this.authTitle.textContent = 'Sign in to CryptoDash';
                this.authSubtitle.textContent = 'Access your professional trading platform';
                break;
            case 'forgotPassword':
                this.forgotPasswordForm?.classList.add('active');
                this.authTitle.textContent = 'Reset Password';
                this.authSubtitle.textContent = 'Enter your email to receive reset instructions';
                break;
            case 'otp':
                this.otpForm?.classList.add('active');
                this.authTitle.textContent = 'Verify Account';
                this.authSubtitle.textContent = 'Complete your account verification';
                break;
            case 'phoneVerification':
                this.phoneVerificationForm?.classList.add('active');
                this.authTitle.textContent = 'Phone Verification';
                this.authSubtitle.textContent = 'Verify your phone number for added security';
                break;
        }
    }

    async handleSignIn(e) {
        e.preventDefault();
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;

        // Validate inputs
        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        this.setButtonLoading(this.signInBtn, true);

        try {
            console.log('🔍 Attempting sign in with backend API:', email);
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
            const response = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            // Store JWT token and user
            localStorage.setItem('cryptodash_token', data.token);
            this.currentUser = data.user;
            
            console.log('✅ Sign in successful:', data.user.email);
            this.showToast('Sign in successful!', 'success');
            this.handleAuthSuccess(data.user, data.token);
            
        } catch (error) {
            console.error('❌ Sign in error:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'An error occurred during sign in';
            if (error.message.includes('Invalid credentials')) {
                errorMessage = 'Invalid email or password. Please try again, or create a new account if you don\'t have one.';
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Connection error. Please check that the backend server is running.';
            } else if (error.message.includes('401')) {
                errorMessage = 'Account not found in the system. Please register first or contact support.';
            } else if (error.message.includes('User not found')) {
                errorMessage = 'No account found with this email. Please sign up first.';
            } else if (error.message.includes('Account not verified')) {
                errorMessage = 'Please verify your email address before signing in.';
            } else if (error.message.includes('Account disabled')) {
                errorMessage = 'This account has been disabled.';
            } else if (error.message.includes('Too many requests')) {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else {
                errorMessage = `Sign in failed: ${error.message}`;
            }
            
            this.showToast(errorMessage, 'error');
        } finally {
            this.setButtonLoading(this.signInBtn, false);
        }
    }

    async handleSignUp(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const phoneNumber = document.getElementById('phoneNumber').value;

        // Validation
        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showToast('Password does not meet requirements', 'error');
            return;
        }

        this.setButtonLoading(this.signUpBtn, true);

        try {
            // Create user account via backend API
            console.log('🔍 Attempting registration with backend API:', email);
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
            const response = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    password, 
                    name: `${firstName} ${lastName}` 
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Registration failed');
            
            console.log('✅ Backend registration successful');
            this.showToast('Account created successfully! Please sign in.', 'success');
            this.switchForm('signin');
            
        } catch (error) {
            console.error('❌ Sign up error:', error);
            this.showToast(error.message || 'Registration failed', 'error');
        } finally {
            this.setButtonLoading(this.signUpBtn, false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;

        this.setButtonLoading(this.resetPasswordBtn, true);

        try {
            await firebase.auth().sendPasswordResetEmail(email);
            this.showToast('Password reset email sent! Check your inbox.', 'success');
            this.switchForm('signin');
        } catch (error) {
            console.error('Password reset error:', error);
            this.handleAuthError(error);
        } finally {
            this.setButtonLoading(this.resetPasswordBtn, false);
        }
    }

    async handleSocialAuth(provider, action) {
        let authProvider;
        
        switch(provider) {
            case 'google':
                authProvider = new firebase.auth.GoogleAuthProvider();
                authProvider.addScope('email');
                authProvider.addScope('profile');
                break;
            case 'microsoft':
                authProvider = new firebase.auth.OAuthProvider('microsoft.com');
                authProvider.addScope('email');
                authProvider.addScope('profile');
                break;
        }

        try {
            const result = await firebase.auth().signInWithPopup(authProvider);
            
            // Save user data for new users
            if (action === 'signUp') {
                await this.saveUserData(result.user, {
                    firstName: result.user.displayName?.split(' ')[0] || '',
                    lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    emailVerified: true,
                    phoneVerified: false,
                    provider: provider
                });
            }

            this.showToast(`${provider} authentication successful!`, 'success');
            this.handleAuthSuccess(result.user);
            
        } catch (error) {
            console.error('Social auth error:', error);
            
            // Handle unauthorized domain error gracefully
            if (error.code === 'auth/unauthorized-domain') {
                this.showToast('Social login not available in development mode. Please use email/password authentication.', 'warning');
            } else {
                this.handleAuthError(error);
            }
        }
    }

    async handlePhoneVerification(e) {
        e.preventDefault();
        const phoneNumber = document.getElementById('verifyPhoneNumber').value;

        this.setButtonLoading(document.getElementById('sendSMSBtn'), true);

        try {
            const appVerifier = window.recaptchaVerifier;
            const confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier);
            
            this.verificationId = confirmationResult.verificationId;
            this.showToast('SMS sent! Enter the verification code.', 'success');
            this.switchForm('otp');
            this.startResendTimer();
            
        } catch (error) {
            console.error('Phone verification error:', error);
            this.handleAuthError(error);
        } finally {
            this.setButtonLoading(document.getElementById('sendSMSBtn'), false);
        }
    }

    async handleOTPVerification(e) {
        e.preventDefault();
        const otpInputs = document.querySelectorAll('.otp-input');
        const otp = Array.from(otpInputs).map(input => input.value).join('');

        if (otp.length !== 6) {
            this.showToast('Please enter complete verification code', 'error');
            return;
        }

        this.setButtonLoading(this.verifyOTPBtn, true);

        try {
            if (this.verificationId) {
                // Phone verification
                const credential = firebase.auth.PhoneAuthProvider.credential(this.verificationId, otp);
                await firebase.auth().currentUser.linkWithCredential(credential);
                
                // Update user data
                await this.updateUserData(firebase.auth().currentUser.uid, {
                    phoneVerified: true
                });
                
                this.showToast('Phone verification successful!', 'success');
            } else {
                // Email verification (custom implementation)
                this.showToast('Email verification successful!', 'success');
            }
            
            this.showSuccessModal('Account Verified!', 'Your account has been successfully verified.');
            
        } catch (error) {
            console.error('OTP verification error:', error);
            this.handleAuthError(error);
        } finally {
            this.setButtonLoading(this.verifyOTPBtn, false);
        }
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('signUpPassword');
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');

        passwordInput?.addEventListener('input', (e) => {
            const password = e.target.value;
            const strength = this.calculatePasswordStrength(password);
            
            strengthFill.className = `strength-fill ${strength.level}`;
            strengthText.textContent = strength.text;
        });
    }

    calculatePasswordStrength(password) {
        let score = 0;
        let feedback = [];

        if (password.length >= 8) score += 1;
        else feedback.push('8+ characters');

        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('lowercase letter');

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('uppercase letter');

        if (/[0-9]/.test(password)) score += 1;
        else feedback.push('number');

        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        else feedback.push('special character');

        const levels = ['weak', 'fair', 'good', 'strong'];
        const texts = [
            `Weak - Add: ${feedback.slice(0, 2).join(', ')}`,
            `Fair - Add: ${feedback.slice(0, 1).join(', ')}`,
            'Good - Almost there!',
            'Strong - Excellent password!'
        ];

        return {
            level: levels[Math.min(score - 1, 3)] || 'weak',
            text: texts[Math.min(score - 1, 3)] || texts[0]
        };
    }

    validatePassword(password) {
        return password.length >= 8 &&
               /[a-z]/.test(password) &&
               /[A-Z]/.test(password) &&
               /[0-9]/.test(password) &&
               /[^A-Za-z0-9]/.test(password);
    }

    setupOTPInputs() {
        const otpInputs = document.querySelectorAll('.otp-input');
        
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                if (value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                
                if (value) {
                    input.classList.add('filled');
                } else {
                    input.classList.remove('filled');
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }

    togglePassword(button) {
        const targetId = button.getAttribute('data-target');
        const targetInput = document.getElementById(targetId);
        const icon = button.querySelector('i');

        if (targetInput.type === 'password') {
            targetInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            targetInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    async sendEmailVerification(user) {
        try {
            await user.sendEmailVerification();
            console.log('Email verification sent');
        } catch (error) {
            console.error('Error sending email verification:', error);
        }
    }

    async saveUserData(user, additionalData) {
        try {
            await firebase.firestore().collection('users').doc(user.uid).set({
                email: user.email,
                displayName: user.displayName,
                uid: user.uid,
                ...additionalData
            });
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    async updateUserData(uid, data) {
        try {
            await firebase.firestore().collection('users').doc(uid).update(data);
        } catch (error) {
            console.error('Error updating user data:', error);
        }
    }

    handleAuthSuccess(user, token = null) {
        // Handle different user object types (Firebase vs Backend)
        if (token) {
            // Backend login - token already provided
            localStorage.setItem('cryptodash_token', token);
            console.log('✅ Backend JWT Token stored successfully');
            this.showSuccessAndRedirect(user);
        } else if (user && typeof user.getIdToken === 'function') {
            // Firebase login - get token from Firebase user
            user.getIdToken().then((firebaseToken) => {
                localStorage.setItem('cryptodash_token', firebaseToken);
                console.log('✅ Firebase JWT Token stored successfully');
                this.showSuccessAndRedirect(user);
            }).catch((error) => {
                console.error('❌ Failed to get Firebase JWT token:', error);
                this.showSuccessAndRedirect(user);
            });
        } else {
            // Backend user object without token method
            console.log('✅ Backend user logged in (token should already be stored)');
            this.showSuccessAndRedirect(user);
        }
    }

    showSuccessAndRedirect(user) {
        setTimeout(() => {
            this.showSuccessModal('Welcome to CryptoDash!', 'You have successfully signed in.');
        }, 500);
    }

    handleAuthError(error) {
        let message = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                message = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password. Please try again.';
                break;
            case 'auth/email-already-in-use':
                message = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak. Please choose a stronger password.';
                break;
            case 'auth/invalid-email':
                message = 'Invalid email address format.';
                break;
            case 'auth/too-many-requests':
                message = 'Too many failed attempts. Please try again later.';
                break;
        }
        
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
        `;

        this.toastContainer.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto hide after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }

    showSuccessModal(title, message) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        this.successModal.classList.add('show');
    }

    setButtonLoading(button, loading) {
        if (!button) {
            console.warn('Button element not found for loading state');
            return;
        }
        
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    startResendTimer() {
        let countdown = 60;
        const countdownElement = document.getElementById('countdown');
        
        this.resendOTPBtn.disabled = true;
        
        this.resendTimer = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(this.resendTimer);
                this.resendOTPBtn.disabled = false;
                this.resendOTPBtn.innerHTML = 'Resend Code';
            }
        }, 1000);
    }

    async resendOTP() {
        try {
            if (this.verificationId) {
                // Resend SMS
                const phoneNumber = document.getElementById('verifyPhoneNumber').value;
                const appVerifier = window.recaptchaVerifier;
                const confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier);
                this.verificationId = confirmationResult.verificationId;
            } else {
                // Resend email verification
                await this.sendEmailVerification(firebase.auth().currentUser);
            }
            
            this.showToast('Verification code resent!', 'success');
            this.startResendTimer();
            
        } catch (error) {
            console.error('Resend error:', error);
            this.handleAuthError(error);
        }
    }

    async redirectToDashboard() {
        try {
            // Check if we have a valid token stored
            const existingToken = localStorage.getItem('cryptodash_token');
            
            if (this.currentUser && typeof this.currentUser.getIdToken === 'function') {
                // Firebase user - get fresh token
                console.log('Getting fresh Firebase token before redirect...');
                const token = await this.currentUser.getIdToken(true);
                localStorage.setItem('cryptodash_token', token);
                console.log('Firebase token stored, redirecting to dashboard...');
            } else if (existingToken) {
                // Backend user - token already stored, just verify it exists
                console.log('Backend token found, redirecting to dashboard...');
            } else {
                console.warn('No token available, redirecting anyway...');
            }
            
            // Small delay to ensure everything is saved
            setTimeout(() => {
                const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
                window.location.href = `${baseUrl}/dashboard.html`;
            }, 500);
            
        } catch (error) {
            console.error('Error preparing redirect:', error);
            // Redirect anyway - dashboard will handle auth check
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
            window.location.href = `${baseUrl}/dashboard.html`;
        }
    }
}

// Initialize the authentication system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoDashAuth = new CryptoDashAuth();
});

// Global functions for external access
window.switchAuthForm = (formType) => {
    if (window.cryptoDashAuth) {
        window.cryptoDashAuth.switchForm(formType);
    }
};

window.signOut = async () => {
    try {
        await firebase.auth().signOut();
        localStorage.removeItem('cryptodash_token');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Sign out error:', error);
    }
};
