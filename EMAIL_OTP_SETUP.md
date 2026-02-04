# ✅ Email OTP System - Complete Setup Guide

**Date:** February 3, 2026  
**Status:** IMPLEMENTED & READY

---

## 🎯 What's Been Implemented

### ✅ Complete OTP Email System
1. **Email Service** (`backend/src/utils/email.util.ts`)
   - Send OTP via email
   - Send welcome emails
   - Send password reset emails
   - Beautiful HTML email templates

2. **OTP Database Storage** (`otps` table)
   - Stores OTP codes with expiry (10 minutes)
   - Prevents OTP reuse
   - Tracks verification status

3. **Updated Auth Service**
   - `sendOTP` - Generates OTP, stores in DB, sends via email
   - `verifyOTP` - Validates OTP from database with expiry check

---

## 📧 SMTP Configuration

### Option 1: Gmail (Recommended for Testing)

**Step 1: Enable 2-Factor Authentication**
1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification

**Step 2: Generate App Password**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name it "RTM Dating App"
4. Click "Generate"
5. Copy the 16-character password

**Step 3: Update `.env` file**
```env
# Email (Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-16-char-app-password"
```

**Step 4: Restart Backend**
```bash
cd /home/joeey/rtmadmin.e-clicks.net/backend
pm2 restart rtm-backend
```

---

### Option 2: SendGrid (Recommended for Production)

**Step 1: Create SendGrid Account**
1. Sign up at https://sendgrid.com
2. Verify your email
3. Create an API key

**Step 2: Update `.env` file**
```env
# Email (SendGrid)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASSWORD="your-sendgrid-api-key"
```

---

### Option 3: Mailgun

**Step 1: Create Mailgun Account**
1. Sign up at https://www.mailgun.com
2. Add and verify your domain
3. Get SMTP credentials

**Step 2: Update `.env` file**
```env
# Email (Mailgun)
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@your-domain.com"
SMTP_PASSWORD="your-mailgun-password"
```

---

### Option 4: Custom SMTP Server

```env
# Email (Custom SMTP)
SMTP_HOST="mail.your-domain.com"
SMTP_PORT=587
SMTP_USER="noreply@your-domain.com"
SMTP_PASSWORD="your-password"
```

---

## 🧪 Testing OTP Email

### Test 1: Send OTP

```bash
curl -X POST https://rtmadmin.e-clicks.net/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "user@example.com",
    "type": "email"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "message": "OTP sent successfully",
    "otp": "123456"  // Only in development mode
  }
}
```

**Check:**
- ✅ Email received in inbox
- ✅ OTP code visible in email
- ✅ Email template looks good

---

### Test 2: Verify OTP

```bash
curl -X POST https://rtmadmin.e-clicks.net/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "user@example.com",
    "otp": "123456",
    "type": "email"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification successful",
  "data": {
    "message": "Verification successful",
    "verified": true
  }
}
```

---

## 📋 Email Templates

### 1. OTP Verification Email
- **Subject:** "Your OTP Verification Code"
- **Content:** Beautiful gradient header, large OTP display, expiry warning
- **Expiry:** 10 minutes

### 2. Welcome Email
- **Subject:** "Welcome to RTM Dating App! 💕"
- **Content:** Personalized greeting, next steps, call-to-action
- **Sent:** After successful registration

### 3. Password Reset Email
- **Subject:** "Password Reset Request"
- **Content:** Reset link, expiry notice, security warning
- **Expiry:** 1 hour

---

## 🔒 Security Features

1. **OTP Expiry** - All OTPs expire after 10 minutes
2. **One-Time Use** - OTPs are marked as verified after use
3. **Database Storage** - OTPs stored securely in database
4. **Rate Limiting** - Prevent OTP spam (can be added)
5. **Secure Templates** - No sensitive data in emails

---

## 🚀 Current Status

### ✅ Working (Without SMTP Config)
- OTP generation
- OTP storage in database
- OTP validation with expiry
- Console logging (development mode)

### ⚠️ Needs SMTP Config
- Actual email sending
- Production email delivery

---

## 📱 Flutter Integration

### Send OTP
```dart
final response = await authService.sendOtp(
  emailOrPhone: 'user@example.com',
  type: 'email',
);
```

### Verify OTP
```dart
final response = await authService.verifyOtp(
  emailOrPhone: 'user@example.com',
  otp: '123456',
  type: 'email',
);
```

---

## 🛠️ Troubleshooting

### Issue 1: Emails Not Sending

**Check:**
```bash
# Check backend logs
pm2 logs rtm-backend --lines 50

# Look for:
# ⚠️  SMTP credentials not configured
# OR
# ✅ OTP email sent to user@example.com
```

**Solution:**
- Verify SMTP credentials in `.env`
- Restart backend: `pm2 restart rtm-backend`
- Test SMTP connection (see below)

---

### Issue 2: Gmail "Less Secure Apps" Error

**Solution:**
- Use App Password (not regular password)
- Enable 2-Factor Authentication first
- Generate new App Password

---

### Issue 3: Emails Going to Spam

**Solution:**
- Use verified domain
- Add SPF/DKIM records
- Use professional email service (SendGrid, Mailgun)
- Avoid spam trigger words

---

## 🧪 Test SMTP Connection

Create a test file: `backend/src/scripts/test-email.ts`

```typescript
import { verifyEmailConnection, sendOTPEmail } from '../utils/email.util';

async function testEmail() {
    console.log('Testing SMTP connection...');
    
    const isConnected = await verifyEmailConnection();
    
    if (isConnected) {
        console.log('✅ SMTP connection successful!');
        
        // Test sending OTP
        await sendOTPEmail('your-test-email@example.com', '123456');
        console.log('✅ Test email sent!');
    } else {
        console.log('❌ SMTP connection failed');
    }
}

testEmail();
```

Run:
```bash
cd /home/joeey/rtmadmin.e-clicks.net/backend
ts-node src/scripts/test-email.ts
```

---

## 📊 Database Schema

### OTPs Table
```sql
CREATE TABLE otps (
  id TEXT PRIMARY KEY,
  "emailOrPhone" TEXT NOT NULL,
  otp TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'email' or 'phone'
  "expiresAt" TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `(emailOrPhone, type)` - Fast lookup
- `expiresAt` - Cleanup expired OTPs

---

## 🔄 OTP Cleanup (Optional)

Add a cron job to clean up expired OTPs:

```typescript
// backend/src/scripts/cleanup-otps.ts
import { prisma } from '../server';

async function cleanupExpiredOTPs() {
    const result = await prisma.oTP.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    });
    
    console.log(`🧹 Cleaned up ${result.count} expired OTPs`);
}

cleanupExpiredOTPs();
```

Run daily:
```bash
# Add to crontab
0 2 * * * cd /home/joeey/rtmadmin.e-clicks.net/backend && ts-node src/scripts/cleanup-otps.ts
```

---

## ✅ Quick Setup Checklist

- [ ] Choose SMTP provider (Gmail, SendGrid, Mailgun)
- [ ] Get SMTP credentials
- [ ] Update `.env` file with SMTP settings
- [ ] Restart backend: `pm2 restart rtm-backend`
- [ ] Test OTP sending
- [ ] Test OTP verification
- [ ] Check email delivery
- [ ] Verify email template looks good
- [ ] Test on Flutter app

---

## 🎯 Next Steps

1. **Configure SMTP** - Add your SMTP credentials to `.env`
2. **Test Email Sending** - Send test OTP to your email
3. **Update Flutter App** - Integrate OTP flow
4. **Add SMS Support** - Configure Twilio for SMS OTPs (optional)
5. **Monitor Delivery** - Check email delivery rates

---

## 📞 SMTP Providers Comparison

| Provider | Free Tier | Reliability | Setup Difficulty |
|----------|-----------|-------------|------------------|
| Gmail | 500/day | Good | Easy |
| SendGrid | 100/day | Excellent | Easy |
| Mailgun | 5,000/month | Excellent | Medium |
| AWS SES | 62,000/month | Excellent | Hard |

**Recommendation:**
- **Development:** Gmail (easiest setup)
- **Production:** SendGrid or Mailgun (better deliverability)

---

**Ready to send OTPs via email! 📧** Just configure your SMTP credentials and restart the backend.
