// Professional Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 CryptoDash Authentication System Loading...');
    
    // Initialize all authentication features
    initFormSwitching();
    initPasswordToggle();
    initPasswordStrength();
    initVerificationCode();
    initFormValidation();
    initSocialAuth();
    initToastSystem();
    
    console.log('✅ Authentication System Loaded!');
});

// Global Form Switching Function
function switchToForm(formType) {
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const verificationForm = document.getElementById('verificationForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    
    // Hide all forms
    [signInForm, signUpForm, forgotPasswordForm, verificationForm].forEach(form => {
        if (form) form.classList.remove('active');
    });
    
    // Show target form and update header
    switch(formType) {
        case 'signUp':
            signUpForm?.classList.add('active');
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Join thousands of professional traders';
            break;
        case 'signIn':
            signInForm?.classList.add('active');
            authTitle.textContent = 'Welcome Back';
            authSubtitle.textContent = 'Sign in to access your professional trading platform';
            break;
        case 'forgotPassword':
            forgotPasswordForm?.classList.add('active');
            authTitle.textContent = 'Reset Password';
            authSubtitle.textContent = 'Enter your email to reset your password';
            break;
        case 'verification':
            verificationForm?.classList.add('active');
            authTitle.textContent = 'Verify Account';
            authSubtitle.textContent = 'Complete your account verification';
            break;
    }
}

// Form Switching Logic
function initFormSwitching() {
    const showSignUpForm = document.getElementById('showSignUpForm');
    const showSignInForm = document.getElementById('showSignInForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToSignIn = document.getElementById('backToSignIn');
    
    showSignUpForm?.addEventListener('click', (e) => {
        e.preventDefault();
        switchToForm('signUp');
    });
    
    showSignInForm?.addEventListener('click', (e) => {
        e.preventDefault();
        switchToForm('signIn');
    });
    
    forgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        switchToForm('forgotPassword');
    });
    
    backToSignIn?.addEventListener('click', (e) => {
        e.preventDefault();
        switchToForm('signIn');
    });
}

// Password Toggle Functionality
function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                targetInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// Password Strength Indicator
function initPasswordStrength() {
    const passwordInput = document.getElementById('signUpPassword');
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (!passwordInput || !strengthBar || !strengthText) return;
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        
        // Update strength bar
        strengthBar.className = `strength-fill ${strength.level}`;
        strengthText.textContent = `Password strength: ${strength.text}`;
    });
}

function calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) score += 25;
    else feedback.push('At least 8 characters');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push('One uppercase letter');
    
    // Lowercase check
    if (/[a-z]/.test(password)) score += 25;
    else feedback.push('One lowercase letter');
    
    // Number check
    if (/\d/.test(password)) score += 15;
    else feedback.push('One number');
    
    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
    else feedback.push('One special character');
    
    // Determine strength level
    let level, text;
    if (score < 25) {
        level = 'weak';
        text = 'Weak';
    } else if (score < 50) {
        level = 'fair';
        text = 'Fair';
    } else if (score < 75) {
        level = 'good';
        text = 'Good';
    } else {
        level = 'strong';
        text = 'Strong';
    }
    
    return { level, text, score, feedback };
}

// Verification Code Input
function initVerificationCode() {
    const codeInputs = document.querySelectorAll('.code-input');
    
    codeInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            // Only allow numbers
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Add filled class
            if (this.value) {
                this.classList.add('filled');
                
                // Move to next input
                if (index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
            } else {
                this.classList.remove('filled');
            }
            
            // Check if all inputs are filled
            const allFilled = Array.from(codeInputs).every(input => input.value);
            const verifyButton = document.getElementById('verifyCodeBtn');
            if (verifyButton) {
                verifyButton.disabled = !allFilled;
            }
        });
        
        input.addEventListener('keydown', function(e) {
            // Handle backspace
            if (e.key === 'Backspace' && !this.value && index > 0) {
                codeInputs[index - 1].focus();
                codeInputs[index - 1].value = '';
                codeInputs[index - 1].classList.remove('filled');
            }
        });
        
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            const numbers = pastedData.replace(/[^0-9]/g, '');
            
            // Fill inputs with pasted numbers
            for (let i = 0; i < Math.min(numbers.length, codeInputs.length - index); i++) {
                codeInputs[index + i].value = numbers[i];
                codeInputs[index + i].classList.add('filled');
            }
            
            // Focus last filled input
            const lastIndex = Math.min(index + numbers.length - 1, codeInputs.length - 1);
            codeInputs[lastIndex].focus();
        });
    });
}

// Form Validation
function initFormValidation() {
    const forms = document.querySelectorAll('.auth-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
        
        // Real-time validation
        const inputs = form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearFieldError(input));
        });
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formId = form.id;
    
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true);
    
    // Handle different form types
    switch(formId) {
        case 'signInForm':
            handleSignIn(form);
            break;
        case 'signUpForm':
            handleSignUp(form);
            break;
        case 'forgotPasswordForm':
            handleForgotPassword(form);
            break;
        case 'verificationForm':
            handleVerification(form);
            break;
    }
}

// Sign In Handler
async function handleSignIn(form) {
    const email = form.querySelector('#signInEmail').value;
    const password = form.querySelector('#signInPassword').value;
    const rememberMe = form.querySelector('#rememberMe').checked;
    
    try {
        // Set persistence
        if (rememberMe) {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } else {
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        }
        
        // Sign in user
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            showToast('Please verify your email before signing in', 'error');
            setButtonLoading(form.querySelector('button[type="submit"]'), false);
            return;
        }
        
        // Success
        showToast('Welcome back! Redirecting to dashboard...', 'success');
        
        // Save user data
        await saveUserLoginData(user);
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Sign in error:', error);
        handleAuthError(error);
        setButtonLoading(form.querySelector('button[type="submit"]'), false);
    }
}

// Sign Up Handler
async function handleSignUp(form) {
    const firstName = form.querySelector('#firstName').value;
    const lastName = form.querySelector('#lastName').value;
    const email = form.querySelector('#signUpEmail').value;
    const phoneNumber = form.querySelector('#phoneNumber').value;
    const countryCode = form.querySelector('#countryCode').value;
    const password = form.querySelector('#signUpPassword').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;
    const agreeTerms = form.querySelector('#agreeTerms').checked;
    const emailUpdates = form.querySelector('#emailUpdates').checked;
    
    // Additional validation
    if (password !== confirmPassword) {
        showFieldError(form.querySelector('#confirmPassword'), 'Passwords do not match');
        setButtonLoading(form.querySelector('button[type="submit"]'), false);
        return;
    }
    
    if (!agreeTerms) {
        showToast('Please agree to the Terms of Service', 'error');
        setButtonLoading(form.querySelector('button[type="submit"]'), false);
        return;
    }
    
    try {
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: `${firstName} ${lastName}`
        });
        
        // Save additional user data to Firestore
        await db.collection('users').doc(user.uid).set({
            firstName,
            lastName,
            email,
            phoneNumber: phoneNumber ? `${countryCode}${phoneNumber}` : null,
            emailUpdates,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false,
            phoneVerified: false,
            profileComplete: false
        });
        
        // Send email verification
        await user.sendEmailVerification({
            url: window.location.origin + '/auth.html?verified=true'
        });
        
        showToast('Account created! Please check your email for verification.', 'success');
        
        // Switch to verification form
        switchToForm('verification');
        document.getElementById('verificationMessage').textContent = 
            `We've sent a verification link to ${email}. Please check your email and click the link to verify your account.`;
        
    } catch (error) {
        console.error('Sign up error:', error);
        handleAuthError(error);
    }
    
    setButtonLoading(form.querySelector('button[type="submit"]'), false);
}

// Forgot Password Handler
async function handleForgotPassword(form) {
    const email = form.querySelector('#resetEmail').value;
    
    try {
        await auth.sendPasswordResetEmail(email, {
            url: window.location.origin + '/auth.html'
        });
        
        showToast('Password reset email sent! Check your inbox.', 'success');
        
        // Switch back to sign in
        setTimeout(() => {
            switchToForm('signIn');
        }, 2000);
        
    } catch (error) {
        console.error('Password reset error:', error);
        handleAuthError(error);
    }
    
    setButtonLoading(form.querySelector('button[type="submit"]'), false);
}

// Verification Handler
async function handleVerification(form) {
    const codeInputs = document.querySelectorAll('.code-input');
    const code = Array.from(codeInputs).map(input => input.value).join('');
    
    try {
        if (confirmationResult) {
            // Phone verification
            const result = await confirmationResult.confirm(code);
            const user = result.user;
            
            // Update user as phone verified
            await db.collection('users').doc(user.uid).update({
                phoneVerified: true
            });
            
            showSuccessModal();
        } else {
            // Email verification (already handled by Firebase)
            showToast('Email verification completed!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        showToast('Invalid verification code. Please try again.', 'error');
    }
    
    setButtonLoading(form.querySelector('button[type="submit"]'), false);
}

// Social Authentication
function initSocialAuth() {
    // Google Sign In
    document.getElementById('googleSignInBtn')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('googleSignUpBtn')?.addEventListener('click', handleGoogleSignUp);
    
    // Microsoft Sign In
    document.getElementById('microsoftSignInBtn')?.addEventListener('click', handleMicrosoftSignIn);
    document.getElementById('microsoftSignUpBtn')?.addEventListener('click', handleMicrosoftSignUp);
}

async function handleGoogleSignIn() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // New user - create profile
            await createSocialUserProfile(user, 'google');
        }
        
        showToast('Successfully signed in with Google!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Google sign in error:', error);
        handleAuthError(error);
    }
}

async function handleGoogleSignUp() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        // Create user profile
        await createSocialUserProfile(user, 'google');
        
        showToast('Account created successfully with Google!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Google sign up error:', error);
        handleAuthError(error);
    }
}

async function handleMicrosoftSignIn() {
    try {
        const result = await auth.signInWithPopup(microsoftProvider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            await createSocialUserProfile(user, 'microsoft');
        }
        
        showToast('Successfully signed in with Microsoft!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Microsoft sign in error:', error);
        handleAuthError(error);
    }
}

async function handleMicrosoftSignUp() {
    try {
        const result = await auth.signInWithPopup(microsoftProvider);
        const user = result.user;
        
        await createSocialUserProfile(user, 'microsoft');
        
        showToast('Account created successfully with Microsoft!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Microsoft sign up error:', error);
        handleAuthError(error);
    }
}

// Create social user profile
async function createSocialUserProfile(user, provider) {
    const names = user.displayName ? user.displayName.split(' ') : ['', ''];
    
    await db.collection('users').doc(user.uid).set({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        profilePicture: user.photoURL || null,
        provider: provider,
        emailVerified: user.emailVerified,
        phoneVerified: !!user.phoneNumber,
        profileComplete: true,
        emailUpdates: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Save user login data
async function saveUserLoginData(user) {
    await db.collection('users').doc(user.uid).update({
        lastSignIn: firebase.firestore.FieldValue.serverTimestamp(),
        lastIpAddress: await getUserIP()
    });
}

// Get user IP address
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error getting IP:', error);
        return null;
    }
}

// Utility Functions
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    let isValid = true;
    let errorMessage = '';
    
    // Required check
    if (field.hasAttribute('required') && !value) {
        errorMessage = 'This field is required';
        isValid = false;
    }
    // Email validation
    else if (type === 'email' && value && !isValidEmail(value)) {
        errorMessage = 'Please enter a valid email address';
        isValid = false;
    }
    // Password validation
    else if (field.id.includes('Password') && value && value.length < 8) {
        errorMessage = 'Password must be at least 8 characters';
        isValid = false;
    }
    // Phone validation
    else if (type === 'tel' && value && !isValidPhone(value)) {
        errorMessage = 'Please enter a valid phone number';
        isValid = false;
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    } else {
        showFieldSuccess(field);
    }
    
    return isValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^\d{10,15}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('error');
    formGroup.classList.remove('success');
    
    // Remove existing error message
    const existingError = formGroup.querySelector('.form-error');
    if (existingError) existingError.remove();
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    field.parentNode.insertAdjacentElement('afterend', errorDiv);
}

function showFieldSuccess(field) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('success');
    formGroup.classList.remove('error');
    
    // Remove error message
    const existingError = formGroup.querySelector('.form-error');
    if (existingError) existingError.remove();
}

function clearFieldError(field) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.remove('error', 'success');
    
    const existingError = formGroup.querySelector('.form-error');
    if (existingError) existingError.remove();
}

function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function handleAuthError(error) {
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
            message = 'Please enter a valid email address.';
            break;
        case 'auth/user-disabled':
            message = 'This account has been disabled. Please contact support.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please try again later.';
            break;
        case 'auth/popup-closed-by-user':
            message = 'Sign-in popup was closed. Please try again.';
            break;
        case 'auth/popup-blocked':
            message = 'Popup was blocked. Please allow popups and try again.';
            break;
    }
    
    showToast(message, 'error');
}

// Toast System
function initToastSystem() {
    // Auto-hide toasts after 5 seconds
    setTimeout(() => {
        const toasts = document.querySelectorAll('.toast:not(.hidden)');
        toasts.forEach(toast => {
            hideToast(toast.id);
        });
    }, 5000);
    
    // Continue to App button
    document.getElementById('continueToApp')?.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
    
    // Resend code functionality
    document.getElementById('resendCodeBtn')?.addEventListener('click', handleResendCode);
}

function showToast(message, type = 'info') {
    const toastId = type + 'Toast';
    const toast = document.getElementById(toastId);
    const messageElement = document.getElementById(type + 'Message');
    
    if (toast && messageElement) {
        messageElement.textContent = message;
        toast.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideToast(toastId);
        }, 5000);
    }
}

function hideToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.add('hidden');
    }
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Resend verification code
async function handleResendCode() {
    const resendBtn = document.getElementById('resendCodeBtn');
    const timerElement = document.getElementById('resendTimer');
    const timerCount = document.getElementById('timerCount');
    
    try {
        // Hide resend button and show timer
        resendBtn.style.display = 'none';
        timerElement.classList.remove('hidden');
        
        let countdown = 60;
        const timer = setInterval(() => {
            countdown--;
            timerCount.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(timer);
                resendBtn.style.display = 'inline';
                timerElement.classList.add('hidden');
            }
        }, 1000);
        
        // Resend verification email
        if (currentUser && !currentUser.emailVerified) {
            await currentUser.sendEmailVerification();
            showToast('Verification email resent!', 'success');
        }
        
    } catch (error) {
        console.error('Resend error:', error);
        showToast('Failed to resend verification. Please try again.', 'error');
        
        // Reset UI
        resendBtn.style.display = 'inline';
        timerElement.classList.add('hidden');
    }
}

// Check for email verification on page load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
        showToast('Email verified successfully! You can now sign in.', 'success');
        switchToForm('signIn');
    }
});

// Export functions for global use
window.authFunctions = {
    showToast,
    hideToast,
    switchToForm,
    showSuccessModal
};

// Also export switchToForm directly to window for immediate access
window.switchToForm = switchToForm;
