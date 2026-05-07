// Test script to verify Firebase email configuration
const axios = require('axios');
require('dotenv').config();

async function testFirebaseEmail() {
  const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';

  console.log('🔍 Firebase Email Configuration Test');
  console.log('=====================================');
  console.log(`Firebase API Key: ${firebaseWebApiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`Frontend URL: ${frontendUrl}`);
  console.log(`Reset URL: ${frontendUrl}/confirm-password-reset`);
  console.log('');

  if (!firebaseWebApiKey) {
    console.log('❌ FIREBASE_WEB_API_KEY is not set in environment variables');
    console.log('   Add it to your .env file or server environment');
    return;
  }

  try {
    console.log('🧪 Testing Firebase API connectivity...');

    // Test with a dummy email to check if Firebase responds
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(firebaseWebApiKey)}`,
      {
        identifier: 'test@example.com',
        continueUri: 'http://localhost',
      }
    );

    console.log('✅ Firebase API is accessible');
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    console.log('❌ Firebase API test failed:');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);

    if (error.response?.data?.error?.message?.includes('API_KEY_INVALID')) {
      console.log('   → Check if FIREBASE_WEB_API_KEY is correct');
    }
  }

  console.log('');
  console.log('📧 Email Configuration Checklist:');
  console.log('==================================');
  console.log('1. ✅ Firebase API Key configured');
  console.log(`2. ${frontendUrl !== 'http://localhost:4000' ? '✅' : '❌'} FRONTEND_URL set for production`);
  console.log('3. Check Firebase Console → Authentication → Templates');
  console.log('   - Password reset email should be enabled');
  console.log('   - Custom domain should match your FRONTEND_URL');
  console.log('');
  console.log('🔗 Test URLs:');
  console.log(`   Reset Request: ${frontendUrl}/reset-password.html`);
  console.log(`   Reset Confirm: ${frontendUrl}/confirm-password-reset.html`);
}

// Uncomment to run the test
// testFirebaseEmail();

module.exports = { testFirebaseEmail };