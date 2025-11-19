// Load environment variables with override
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
  console.error('Failed to load .env file:', result.error);
  process.exit(1);
}

console.log('Environment variables after dotenv load:');
console.log('  POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('  POSTGRES_PORT:', process.env.POSTGRES_PORT);
console.log('  POSTGRES_DB:', process.env.POSTGRES_DB);
console.log('  POSTGRES_USER:', process.env.POSTGRES_USER);
console.log('');

// NOW import after env is loaded
import { getPool, healthCheck, query } from '../lib/postgres';

async function testConnection() {
  console.log('============================================================');
  console.log('PostgreSQL Connection Test');
  console.log('============================================================');

  console.log('\n📋 Connection Details:');
  console.log('   Host: ' + process.env.POSTGRES_HOST);
  console.log('   Port: ' + process.env.POSTGRES_PORT);
  console.log('   Database: ' + process.env.POSTGRES_DB);
  console.log('   User: ' + process.env.POSTGRES_USER);

  try {
    console.log('\n🔌 Testing connection...');
    const pool = getPool();
    console.log('\n✅ Pool created successfully');

    console.log('\n🏥 Running health check...');
    const isHealthy = await healthCheck();

    if (!isHealthy) {
      throw new Error('Health check failed');
    }

    console.log('✅ Health check passed');

    console.log('\n📊 Database Information:');
    const versionResult = await query('SELECT version()');
    console.log('   Version: ' + versionResult.rows[0].version);

    const tablesResult = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    console.log('\n📂 Existing Tables (' + tablesResult.rowCount + '):');
    if (tablesResult.rowCount === 0) {
      console.log('   (No tables found - database is empty)');
    } else {
      tablesResult.rows.forEach((row: any) => {
        console.log('   - ' + row.table_name);
      });
    }

    console.log('\n============================================================');
    console.log('✅ Connection test completed successfully!');
    console.log('============================================================');

    process.exit(0);
  } catch (error: any) {
    console.error('\n============================================================');
    console.error('❌ Connection test failed!');
    console.error('============================================================');
    console.error('\n📋 Error Details:');
    console.error('   Message: ' + error.message);
    if (error.code) {
      console.error('   Code: ' + error.code);
    }

    console.error('\n💡 Troubleshooting Tips:');
    console.error('   1. Check if PostgreSQL server is running');
    console.error('   2. Verify firewall allows connection to port 5432');
    console.error('   3. Confirm credentials are correct');
    console.error('   4. Check if database exists');
    console.error('   5. Verify user has appropriate permissions');
    console.error('   6. Test connectivity: ping ' + process.env.POSTGRES_HOST);

    console.error('\n============================================================');
    process.exit(1);
  }
}

testConnection();
