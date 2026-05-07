// Test script to verify password reset functionality
const axios = require('axios');

async function testPasswordReset() {
  try {
    console.log('Testing password reset functionality...');

    // Test 1: Request password reset email
    console.log('\n1. Testing forgot password email request...');
    const emailResponse = await axios.post('http://localhost:4000/api/auth/forgot-password/email', {
      email: 'test@example.com' // Use a test email
    });
    console.log('Email request response:', emailResponse.data);

    // Note: In a real test, you would need to:
    // 1. Get the oobCode from the email link
    // 2. Call the reset endpoint with the code and new password
    // 3. Verify login works with the new password

    console.log('\nPassword reset flow test completed.');
    console.log('To fully test:');
    console.log('1. Use a real email to receive the reset link');
    console.log('2. Extract the oobCode from the email URL');
    console.log('3. Call POST /api/auth/forgot-password/reset with oobCode and newPassword');
    console.log('4. Try logging in with the new password');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Uncomment to run the test
// testPasswordReset();

module.exports = { testPasswordReset };