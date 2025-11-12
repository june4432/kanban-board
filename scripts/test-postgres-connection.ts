/**
 * Test PostgreSQL Connection
 * Verifies that the application can connect to PostgreSQL
 */

import { getPool, healthCheck } from '../lib/postgres';

async function testConnection() {
  console.log('🔍 Testing PostgreSQL connection...\n');

  try {
    // Test health check
    console.log('1. Running health check...');
    const isHealthy = await healthCheck();

    if (isHealthy) {
      console.log('   ✅ Health check passed\n');
    } else {
      console.log('   ❌ Health check failed\n');
      process.exit(1);
    }

    // Test query
    console.log('2. Testing query execution...');
    const pool = getPool();
    const result = await pool.query('SELECT version()');
    console.log('   ✅ Query executed successfully');
    console.log(`   PostgreSQL version: ${result.rows[0].version}\n`);

    // Test database
    console.log('3. Checking database...');
    const dbResult = await pool.query('SELECT current_database()');
    console.log(`   ✅ Connected to database: ${dbResult.rows[0].current_database}\n`);

    console.log('✨ All connection tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

// Run test
testConnection();
