import { Account } from '../../entities/Account';

export interface GetAccountUseCase {
  getById(id: string): Promise<Account>;
  getByUserId(userId: string): Promise<Account[]>;
  getByUserIdAndCurrency(userId: string, currency: string): Promise<Account | null>;
}
