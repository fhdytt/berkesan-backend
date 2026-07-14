const { Pool } = require("pg");

// Konfigurasi pool yang lebih robust
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // SSL untuk production (Railway/Cloud)
  ssl: process.env.NODE_ENV === "production" 
    ? { rejectUnauthorized: false } 
    : false,
  // Connection pool optimization
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  min: parseInt(process.env.DB_POOL_MIN) || 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Retry logic
  retryDelay: 1000,
  retryCount: 3,
};

const pool = new Pool(poolConfig);

// Event listeners untuk monitoring
pool.on("connect", () => {
  console.log("Database connected successfully");
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message);
  // Jangan exit process, biar retry connection
});

pool.on("acquire", () => {
  // Optional: untuk debugging connection leak
  if (process.env.NODE_ENV === "development") {
    console.debug("Client acquired from pool");
  }
});

// Test connection on startup
const testConnection = async () => {
  let retries = 0;
  const maxRetries = poolConfig.retryCount;
  
  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      const result = await client.query("SELECT NOW() as time");
      console.log(`Database connected at ${result.rows[0].time}`);
      client.release();
      return true;
    } catch (err) {
      retries++;
      console.error(`Database connection attempt ${retries}/${maxRetries} failed:`, err.message);
      
      if (retries === maxRetries) {
        console.error("Failed to connect to database after multiple attempts");
        process.exit(1);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, poolConfig.retryDelay * retries));
    }
  }
};

// Helper untuk query dengan error handling
const query = async (text, params, client = null) => {
  const start = Date.now();
  const dbClient = client || pool;
  
  try {
    const result = await dbClient.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 100ms) di development
    if (process.env.NODE_ENV === "development" && duration > 100) {
      console.warn(`Slow query (${duration}ms):`, { text, params });
    }
    
    return result;
  } catch (error) {
    console.error("Query error:", { 
      text, 
      params, 
      error: error.message,
      duration: Date.now() - start 
    });
    throw error;
  }
};

// Helper untuk transaksi
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Export semua yang dibutuhkan
module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  getClient: () => pool.connect(), // Untuk manual client management
};