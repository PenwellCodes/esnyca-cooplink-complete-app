// Test script to verify dual authentication (SQL + Firebase)
const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

async function testServerHealth() {
  console.log('🏥 Server Health Check');
  console.log('=====================');

  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is healthy');
    console.log(`Status: ${response.status}`);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed');
    console.log(`Error: ${error.message}`);
    return false;
  }
}

async function testDualAuthentication() {
  console.log('🔐 Dual Authentication Test (SQL + Firebase)');
  console.log('============================================');

  const testEmail = 'test@example.com'; // Use a real test email
  const testPassword = 'testpassword123';

  console.log(`Testing with email: ${testEmail}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  try {
    console.log('🧪 Testing login endpoint...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: testPassword
    });

    console.log('✅ Login successful!');
    console.log('Response data:');
    console.log(`  Status: ${response.data.status}`);
    console.log(`  User ID: ${response.data.user?.Id}`);
    console.log(`  User Email: ${response.data.user?.Email}`);
    console.log(`  User Role: ${response.data.role}`);
    console.log(`  Is Admin: ${response.data.isAdmin}`);
    console.log(`  Auth Method: ${response.data.authMethod || 'unknown'}`);

    if (response.data.authMethod) {
      console.log('');
      console.log('🔍 Authentication Method Details:');
      switch (response.data.authMethod) {
        case 'sql':
          console.log('  ✅ Authenticated using SQL database');
          break;
        case 'firebase':
          console.log('  ✅ Authenticated using Firebase (with SQL sync)');
          break;
        case 'firebase_fallback':
          console.log('  ✅ Authenticated using Firebase (SQL connection failed)');
          break;
        default:
          console.log(`  ❓ Unknown auth method: ${response.data.authMethod}`);
      }
    }

  } catch (error) {
    console.log('❌ Login failed:');
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;

    console.log(`  Status Code: ${statusCode}`);
    console.log(`  Error: ${errorMessage}`);

    if (statusCode === 401) {
      console.log('');
      console.log('🔍 Troubleshooting 401 Unauthorized:');
      console.log('1. Check if the email exists in SQL database or Firebase');
      console.log('2. Verify the password is correct');
      console.log('3. Ensure Firebase API key is valid');
      console.log('4. Check SQL Server connection if using SQL auth');
    }

    if (statusCode === 500) {
      console.log('');
      console.log('🔍 Troubleshooting 500 Server Error:');
      console.log('1. Check server logs for detailed error information');
      console.log('2. Verify database connection settings');
      console.log('3. Ensure all required environment variables are set');
    }
  }

  console.log('');
  console.log('📋 Authentication Flow:');
  console.log('=======================');
  console.log('1. Try SQL authentication first');
  console.log('2. If SQL fails or user not found, try Firebase');
  console.log('3. If Firebase succeeds, sync password to SQL for future logins');
  console.log('4. Return user data with authentication method');
}

// Run tests
async function runTests() {
  const serverHealthy = await testServerHealth();
  if (serverHealthy) {
    console.log('');
    await testDualAuthentication();
  }
}

runTests();

module.exports = { testDualAuthentication };