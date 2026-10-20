import { Pool } from 'pg';

export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
        currency VARCHAR(10) NOT NULL DEFAULT 'COP',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_user_currency UNIQUE (user_id, currency)
      );
    `);

    // Create index on user_id if not exists
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);
    `);

    // 2. Create account_transactions table for deposit audit & idempotency
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_transactions (
        id UUID PRIMARY KEY,
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
        reference VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_account_tx_account_id ON account_transactions (account_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_account_tx_idempotency ON account_transactions (idempotency_key);
    `);

    await client.query('COMMIT');
    console.log('[Database] Migrations executed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Database] Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
