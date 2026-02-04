import { sendOTPEmail, verifyEmailConnection } from '../utils/email.util';
import { config } from 'dotenv';

config();

async function testEmailSending() {
    console.log('🧪 Testing Email Configuration...\n');

    // Test 1: Verify SMTP Connection
    console.log('📡 Test 1: Verifying SMTP connection...');
    const isConnected = await verifyEmailConnection();

    if (!isConnected) {
        console.log('❌ SMTP connection failed!');
        console.log('Please check your SMTP credentials in .env file');
        process.exit(1);
    }

    console.log('✅ SMTP connection successful!\n');

    // Test 2: Send Test OTP Email
    console.log('📧 Test 2: Sending test OTP email...');
    const testEmail = process.env.SMTP_USER || 'support@e-clicks.net';
    const testOTP = '123456';

    try {
        await sendOTPEmail(testEmail, testOTP);
        console.log(`✅ Test email sent to ${testEmail}`);
        console.log(`📬 Please check your inbox for OTP: ${testOTP}\n`);
    } catch (error) {
        console.log('❌ Failed to send test email');
        console.error('Error:', error);
        process.exit(1);
    }

    console.log('🎉 All tests passed!');
    console.log('\nNext steps:');
    console.log('1. Check your email inbox');
    console.log('2. Verify the email template looks good');
    console.log('3. Test OTP verification in your Flutter app');
}

testEmailSending().catch(console.error);
