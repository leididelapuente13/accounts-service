import { Account } from '../../domain/entities/Account';
import { AccountAlreadyExistsException } from '../../domain/exceptions/DomainExceptions';
import { CreateAccountCommand, CreateAccountUseCase } from '../../domain/ports/in/CreateAccountUseCase';
import { AccountRepositoryPort } from '../../domain/ports/out/AccountRepositoryPort';
import { EventPublisherPort } from '../../domain/ports/out/EventPublisherPort';

export class CreateAccountService implements CreateAccountUseCase {
  constructor(
    private readonly accountRepository: AccountRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly usersServiceUrl?: string
  ) {}

  public async execute(command: CreateAccountCommand): Promise<Account> {
    const currency = (command.currency || 'COP').toUpperCase();

    // 1. Check Unique Account per Currency
    const existing = await this.accountRepository.findByUserIdAndCurrency(command.userId, currency);
    if (existing && existing.status === 'ACTIVE') {
      throw new AccountAlreadyExistsException(command.userId, currency);
    }

    // 2. Instantiate Account Entity (Paso-6: Balance = 0.00, Status = ACTIVE)
    const account = Account.create({
      userId: command.userId,
      currency,
      initialBalance: command.initialBalance ?? 0,
      status: 'ACTIVE',
    });

    // 3. Persist to PostgreSQL (Sync SQL)
    await this.accountRepository.save(account);

    // 4. Resolve user name and email for the domain event (Paso-7: Async Publish to RabbitMQ)
    let userName = command.name;
    let userEmail = command.email;

    if ((!userName || !userEmail) && this.usersServiceUrl) {
      const fetched = await this.fetchUserDetails(command.userId);
      if (fetched) {
        userName = userName || fetched.name;
        userEmail = userEmail || fetched.email;
      }
    }

    // 5. Publish domain event to RabbitMQ (domain.events)
    try {
      await this.eventPublisher.publishUserCreated({
        eventName: 'user.created',
        occurredOn: new Date().toISOString(),
        payload: {
          userId: account.userId,
          name: userName || `User ${account.userId}`,
          email: userEmail || '',
          accountId: account.id,
          currency: account.currency,
        },
      });
    } catch (err) {
      console.error('[CreateAccountService] Failed to publish domain event to RabbitMQ:', err);
      // Depending on outbox or strict policy, we log the failure so the HTTP sync response succeeds
    }

    return account;
  }

  private async fetchUserDetails(userId: string): Promise<{ name?: string; email?: string } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url = `${this.usersServiceUrl!.replace(/\/$/, '')}/api/users/${userId}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json() as any;
      return {
        name: data?.name || data?.fullName || data?.username,
        email: data?.email,
      };
    } catch {
      return null;
    }
  }
}
