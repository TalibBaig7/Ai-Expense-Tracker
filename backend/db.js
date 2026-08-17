import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool, types } = pkg;

// Override the default parser for numeric types to return them as strings
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  max: 2,
  idleTimeoutMillis: 5000,  // Release idle connections before Neon drops them
});
pool.on('error', (err) => {
  // Log the error but don't crash — Neon serverless DB can drop idle connections
  console.error('Unexpected postgres error (non-fatal):', err.message);
});
pool.on('connect', () => {
  console.log('Connected to the database successfully!');
});


export default pool;