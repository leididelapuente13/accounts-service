import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Account, AccountStatus } from '../../domain/entities/Account';
import {
  AccountAlreadyExistsException,
  AccountInactiveException,
  AccountNotFoundException,
} from '../../domain/exceptions/DomainExceptions';
import {
  AccountRepositoryPort,
  DepositLockResult,
} from '../../domain/ports/out/AccountRepositoryPort';

export class PostgresAccountRepository implements AccountRepositoryPort {
  constructor(private readonly pool: Pool) {}

  public async save(account: Account): Promise<void> {
    const query = `
      INSERT INTO accounts (id, user_id, balance, currency, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      account.id,
      account.userId,
      account.balance.getValue(),
      account.currency,
      account.status,
      account.createdAt,
      account.updatedAt,
    ];

    try {
      await this.pool.query(query, values);
    } catch (error: any) {
      if (error?.code === '23505') {
        // Unique violation
        throw new AccountAlreadyExistsException(account.userId, account.currency);
      }
      throw error;
    }
  }

  public async findById(id: string): Promise<Account | null> {
    const query = `
      SELECT id, user_id, balance, currency, status, created_at, updated_at
      FROM accounts
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToAccount(result.rows[0]);
  }

  public async findByUserId(userId: string): Promise<Account[]> {
    const query = `
      SELECT id, user_id, balance, currency, status, created_at, updated_at
      FROM accounts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map((row) => this.mapRowToAccount(row));
  }

  public async findByUserIdAndCurrency(userId: string, currency: string): Promise<Account | null> {
    const query = `
      SELECT id, user_id, balance, currency, status, created_at, updated_at
      FROM accounts
      WHERE user_id = $1 AND currency = $2
    `;
    const result = await this.pool.query(query, [userId, currency]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToAccount(result.rows[0]);
  }

  public async depositWithPessimisticLock(
    accountId: string,
    amount: number,
    idempotencyKey: string,
    reference?: string
  ): Promise<DepositLockResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Idempotency Check
      const existingTxQuery = `
        SELECT id, account_id, amount, reference, created_at
        FROM account_transactions
        WHERE idempotency_key = $1
      `;
      const existingTxRes = await client.query(existingTxQuery, [idempotencyKey]);

      if (existingTxRes.rows.length > 0) {
        // Idempotency match: return current account state without re-crediting
        const accountRes = await client.query(
          `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM accounts WHERE id = $1`,
          [accountId]
        );
        await client.query('COMMIT');

        if (accountRes.rows.length === 0) {
          throw new AccountNotFoundException(accountId);
        }

        return {
          account: this.mapRowToAccount(accountRes.rows[0]),
          duplicate: true,
        };
      }

      // 2. Concurrency Control: Pessimistic Lock on Account row (SELECT ... FOR UPDATE)
      const lockQuery = `
        SELECT id, user_id, balance, currency, status, created_at, updated_at
        FROM accounts
        WHERE id = $1
        FOR UPDATE
      `;
      const lockRes = await client.query(lockQuery, [accountId]);

      if (lockRes.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new AccountNotFoundException(accountId);
      }

      const row = lockRes.rows[0];
      if (row.status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        throw new AccountInactiveException(row.status);
      }

      // 3. Update Account Balance
      const updateQuery = `
        UPDATE accounts
        SET balance = balance + $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, user_id, balance, currency, status, created_at, updated_at
      `;
      const updateRes = await client.query(updateQuery, [amount, accountId]);

      // 4. Record Transaction for audit & future idempotency verification
      const txId = uuidv4();
      const insertTxQuery = `
        INSERT INTO account_transactions (id, account_id, idempotency_key, amount, reference, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      await client.query(insertTxQuery, [
        txId,
        accountId,
        idempotencyKey,
        amount,
        reference || null,
      ]);

      await client.query('COMMIT');

      const updatedAccount = this.mapRowToAccount(updateRes.rows[0]);
      return {
        account: updatedAccount,
        duplicate: false,
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors if connection died
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToAccount(row: any): Account {
    return Account.reconstitute(
      row.id,
      row.user_id,
      parseFloat(row.balance),
      row.currency,
      row.status as AccountStatus,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }
}
