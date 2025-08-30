const { Pool } = require('pg');

// Test database connection and device_api_keys table
async function testDatabase() {
  console.log('🔍 Testing database connection and device_api_keys table...');
  
  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log('❌ DATABASE_URL not found in environment');
      return;
    }
    
    console.log('📡 Connecting to database...');
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check if device_api_keys table exists
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'device_api_keys'
        );
      `);
      
      const tableExists = tableCheck.rows[0].exists;
      console.log(`📋 device_api_keys table exists: ${tableExists}`);
      
      if (tableExists) {
        // Check table structure
        const structure = await client.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'device_api_keys' 
          ORDER BY ordinal_position;
        `);
        
        console.log('📋 Table structure:');
        structure.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // Test insert
        const testKey = {
          deviceId: 'test-device-123',
          apiKey: 'test_key_' + Date.now(),
          keyHash: 'test_hash_' + Date.now(),
          deviceName: 'Test Device',
          userInitials: 'TD',
          permissions: ['ssl:read', 'device:read'],
          rateLimit: 1000,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          uuidSubdomain: 'test-device-123.myl.zip'
        };
        
        try {
          const insertResult = await client.query(`
            INSERT INTO device_api_keys (
              device_id, api_key, key_hash, device_name, user_initials, 
              permissions, rate_limit, expires_at, uuid_subdomain
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING device_id, device_name, user_initials;
          `, [
            testKey.deviceId,
            testKey.apiKey,
            testKey.keyHash,
            testKey.deviceName,
            testKey.userInitials,
            JSON.stringify(testKey.permissions),
            testKey.rateLimit,
            testKey.expiresAt,
            testKey.uuidSubdomain
          ]);
          
          console.log('✅ Test insert successful:', insertResult.rows[0]);
          
          // Clean up test data
          await client.query('DELETE FROM device_api_keys WHERE device_id = $1', [testKey.deviceId]);
          console.log('🧹 Test data cleaned up');
          
        } catch (insertError) {
          console.error('❌ Test insert failed:', insertError.message);
        }
      }
      
    } catch (tableError) {
      console.error('❌ Error checking table:', tableError.message);
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

// Run the test
testDatabase();
