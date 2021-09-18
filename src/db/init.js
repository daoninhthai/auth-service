const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const runMigrations = async () => {
  const client = await pool.connect();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get already executed migrations
    const { rows: executed } = await client.query(
      'SELECT name FROM migrations ORDER BY id'
    );
    const executedNames = executed.map(row => row.name);

    // Read migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (executedNames.includes(file)) {
        console.log(`Migration ${file} already executed, skipping...`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`Migration ${file} completed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration ${file} failed:`, error.message);
        throw error;
      }
    }

    console.log('All migrations completed');
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
