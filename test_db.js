require('dotenv').config();
const { Pool } = require('pg');

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'ADA' : 'TIDAK ADA');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('Database connected successfully!');
    console.log('Server time:', result.rows[0].current_time);
    console.log('Database name:', result.rows[0].db_name);
    
    // Test query ke tabel users
    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    console.log('Total users:', usersResult.rows[0].count);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error message:', error.message);
    process.exit(1);
  }
}

testConnection();