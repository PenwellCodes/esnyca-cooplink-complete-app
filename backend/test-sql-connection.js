// Test script to verify SQL Server connection
const sql = require('mssql');
require('dotenv').config();

async function testSqlConnection() {
  console.log('🔍 SQL Server Connection Test');
  console.log('==============================');

  const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: {
      encrypt: process.env.SQL_ENCRYPT === 'true',
      trustServerCertificate: process.env.SQL_TRUST_SERVER_CERT === 'true',
      enableArithAbort: true,
    },
    port: 1433,
  };

  console.log('Configuration:');
  console.log(`  Server: ${config.server}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Encrypt: ${config.options.encrypt}`);
  console.log(`  Trust Server Certificate: ${config.options.trustServerCertificate}`);
  console.log('');

  try {
    console.log('🧪 Testing SQL Server connection...');
    const pool = await sql.connect(config);

    console.log('✅ SQL Server connection successful!');

    // Test a simple query
    const result = await pool.request().query('SELECT TOP 1 Id FROM dbo.Users');
    console.log(`✅ Database query successful! Found ${result.recordset.length} user(s)`);

    await pool.close();
    console.log('✅ Connection closed successfully');

  } catch (error) {
    console.log('❌ SQL Server connection failed:');
    console.log(`   Error: ${error.message}`);

    if (error.code === 'ESOCKET') {
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('1. Check if SQL Server is running on the target server');
      console.log('2. Verify the server address and port (1433)');
      console.log('3. Check firewall settings');
      console.log('4. Verify SQL Server allows remote connections');
      console.log('5. Confirm username/password are correct');
    }

    if (error.code === 'ELOGIN') {
      console.log('');
      console.log('🔧 Authentication Issues:');
      console.log('1. Verify username and password');
      console.log('2. Check if user has access to the database');
      console.log('3. Ensure SQL Server authentication is enabled');
    }
  }

  console.log('');
  console.log('📋 Environment Variables Checklist:');
  console.log('====================================');
  console.log(`SQL_USER: ${process.env.SQL_USER ? '✅ Set' : '❌ Missing'}`);
  console.log(`SQL_PASSWORD: ${process.env.SQL_PASSWORD ? '✅ Set' : '❌ Missing'}`);
  console.log(`SQL_SERVER: ${process.env.SQL_SERVER ? '✅ Set' : '❌ Missing'}`);
  console.log(`SQL_DATABASE: ${process.env.SQL_DATABASE ? '✅ Set' : '❌ Missing'}`);
}

// Uncomment to run the test
testSqlConnection();

module.exports = { testSqlConnection };