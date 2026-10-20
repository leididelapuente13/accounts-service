import { Account } from '../../entities/Account';

export interface DepositLockResult {
  account: Account;
  duplicate: boolean;
}

export interface AccountRepositoryPort {
  save(account: Account): Promise<void>;
  findById(id: string): Promise<Account | null>;
  findByUserId(userId: string): Promise<Account[]>;
  findByUserIdAndCurrency(userId: string, currency: string): Promise<Account | null>;
  depositWithPessimisticLock(
    accountId: string,
    amount: number,
    idempotencyKey: string,
    reference?: string
  ): Promise<DepositLockResult>;
}
