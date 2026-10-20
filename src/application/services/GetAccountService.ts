import { Account } from '../../domain/entities/Account';
import { AccountNotFoundException } from '../../domain/exceptions/DomainExceptions';
import { GetAccountUseCase } from '../../domain/ports/in/GetAccountUseCase';
import { AccountRepositoryPort } from '../../domain/ports/out/AccountRepositoryPort';

export class GetAccountService implements GetAccountUseCase {
  constructor(private readonly accountRepository: AccountRepositoryPort) {}

  public async getById(id: string): Promise<Account> {
    const account = await this.accountRepository.findById(id);
    if (!account) {
      throw new AccountNotFoundException(id);
    }
    return account;
  }

  public async getByUserId(userId: string): Promise<Account[]> {
    return this.accountRepository.findByUserId(userId);
  }

  public async getByUserIdAndCurrency(userId: string, currency: string): Promise<Account | null> {
    return this.accountRepository.findByUserIdAndCurrency(userId, currency.toUpperCase());
  }
}
