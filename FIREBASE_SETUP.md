# 🔥 Firebase Setup Guide for CryptoDash Authentication

## Overview
CryptoDash uses Firebase for comprehensive authentication including:
- ✅ JWT Token-based authentication
- ✅ Google OAuth 2.0
- ✅ Microsoft OAuth
- ✅ Email/Password authentication
- ✅ Email verification with OTP
- ✅ Phone number verification with SMS OTP
- ✅ Password reset functionality
- ✅ User profile management with Firestore

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `cryptodash-auth` (or your preferred name)
4. Enable Google Analytics (optional)
5. Create project

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable the following providers:

### Email/Password
- Click **Email/Password**
- Enable **Email/Password**
- Enable **Email link (passwordless sign-in)** (optional)
- Save

### Google
- Click **Google**
- Enable **Google**
- Select support email
- Save

### Microsoft
- Click **Microsoft**
- Enable **Microsoft**
- Add your **Client ID** and **Client Secret** from Microsoft Azure
- Save

### Phone
- Click **Phone**
- Enable **Phone**
- Configure reCAPTCHA (will be done automatically)
- Save

## Step 3: Configure Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select location closest to your users
5. Create database

## Step 4: Get Firebase Configuration

1. Go to **Project settings** (gear icon)
2. Scroll to **Your apps** section
3. Click **Web app** icon (</>)
4. Register app name: `CryptoDash`
5. Copy the configuration object

## Step 5: Update Firebase Configuration

Replace the placeholder config in `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## Step 6: Configure Microsoft OAuth (Optional)

If you want Microsoft authentication:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Get Client ID and Client Secret
4. Add redirect URI: `https://your-project-id.firebaseapp.com/__/auth/handler`
5. Add these to Firebase Microsoft provider

## Step 7: Set Up Authentication Rules

In Firestore, set up security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for certain collections (if needed)
    match /public/{document=**} {
      allow read: if true;
    }
  }
}
```

## Step 8: Test the System

1. Open `auth.html` in your browser
2. Try creating a new account
3. Check your email for verification
4. Try signing in with Google/Microsoft
5. Test password reset functionality

## Features Included

### ✅ Complete User Registration
- First name, last name, email
- Optional phone number with country code
- Password strength indicator
- Terms of service agreement
- Email subscription preferences

### ✅ Multi-Factor Authentication
- Email verification required
- Phone verification (optional)
- OTP codes for both email and SMS

### ✅ Social Authentication
- Google OAuth with full profile
- Microsoft OAuth integration
- Automatic profile creation

### ✅ Security Features
- JWT tokens with Firebase Auth
- Secure password requirements
- Account lockout after failed attempts
- Password reset with secure links
- Session management (remember me)

### ✅ User Experience
- Professional UI/UX design
- Real-time form validation
- Loading states and error handling
- Responsive design for all devices
- Toast notifications and modals

### ✅ Database Integration
- User profiles stored in Firestore
- Transaction logging
- Login history tracking
- User preferences storage

## Advanced Configuration

### Custom Email Templates
1. Go to Authentication > Templates in Firebase
2. Customize email verification templates
3. Add your branding and styling

### Phone Authentication
1. Enable Phone authentication in Firebase
2. Configure reCAPTCHA for web
3. Set up SMS provider (default is Firebase)

### Analytics Integration
1. Enable Google Analytics in Firebase
2. Track authentication events
3. Monitor user engagement

## Production Deployment

### Domain Configuration
1. Add your production domain to Firebase Auth
2. Update CORS settings
3. Configure custom email action URLs

### Security Hardening
1. Update Firestore security rules
2. Enable App Check for additional security
3. Monitor authentication metrics
4. Set up alerts for suspicious activity

## File Structure

```
/
├── auth.html              # Main authentication page
├── auth-styles.css        # Authentication-specific styles
├── auth-script.js         # Authentication logic
├── firebase-config.js     # Firebase configuration
├── dashboard.html         # Protected dashboard page
├── index.html            # Landing page (updated with auth links)
└── FIREBASE_SETUP.md     # This setup guide
```

## Support

The authentication system is production-ready and includes:
- Comprehensive error handling
- Accessibility features
- Mobile-responsive design
- Professional UI/UX
- Security best practices

Your CryptoDash platform now has enterprise-grade authentication! 🚀
