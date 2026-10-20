import { Account } from '../../src/domain/entities/Account';
import { AccountInactiveException } from '../../src/domain/exceptions/DomainExceptions';

describe('Account Entity', () => {
  it('should create an account with default status ACTIVE and 0.00 COP balance', () => {
    const account = Account.create({
      userId: 'usr_test_1',
    });

    expect(account.id).toBeDefined();
    expect(account.userId).toBe('usr_test_1');
    expect(account.currency).toBe('COP');
    expect(account.balance.getValue()).toBe(0);
    expect(account.status).toBe('ACTIVE');
    expect(account.createdAt).toBeInstanceOf(Date);
  });

  it('should deposit funds when status is ACTIVE', () => {
    const account = Account.create({ userId: 'usr_test_2' });
    account.deposit(50000);
    expect(account.balance.getValue()).toBe(50000);
  });

  it('should reject deposit when account is BLOCKED or SUSPENDED', () => {
    const account = Account.create({ userId: 'usr_test_3' });
    account.block();
    expect(account.status).toBe('BLOCKED');
    expect(() => account.deposit(1000)).toThrow(AccountInactiveException);

    account.suspend();
    expect(account.status).toBe('SUSPENDED');
    expect(() => account.deposit(1000)).toThrow(AccountInactiveException);

    account.activate();
    expect(account.status).toBe('ACTIVE');
    account.deposit(1000);
    expect(account.balance.getValue()).toBe(1000);
  });
});
