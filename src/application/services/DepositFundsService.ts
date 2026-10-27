import { DepositFundsCommand, DepositFundsResult, DepositFundsUseCase } from '../../domain/ports/in/DepositFundsUseCase';
import { AccountRepositoryPort } from '../../domain/ports/out/AccountRepositoryPort';
import { EventPublisherPort } from '../../domain/ports/out/EventPublisherPort';
import { InvalidAmountException } from '../../domain/exceptions/DomainExceptions';

export class DepositFundsService implements DepositFundsUseCase {
  constructor(
    private readonly accountRepository: AccountRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly usersServiceUrl?: string
  ) {}

  public async execute(command: DepositFundsCommand): Promise<DepositFundsResult> {
    if (!command.amount || command.amount <= 0) {
      throw new InvalidAmountException('Deposit amount must be greater than zero');
    }

    if (!command.idempotencyKey || command.idempotencyKey.trim() === '') {
      throw new Error('idempotencyKey is required for deposit operations');
    }

    // Pessimistic locking + Idempotency check executed inside the database transaction
    const { account, duplicate } = await this.accountRepository.depositWithPessimisticLock(
      command.accountId,
      command.amount,
      command.idempotencyKey,
      command.reference
    );

    // Only publish event to RabbitMQ if this is a newly applied deposit (not a duplicate idempotent retry)
    if (!duplicate) {
      let userName = command.name;
      let userEmail = command.email;

      if ((!userName || !userEmail) && this.usersServiceUrl) {
        const fetched = await this.fetchUserDetails(account.userId);
        if (fetched) {
          userName = userName || fetched.name;
          userEmail = userEmail || fetched.email;
        }
      }

      try {
        await this.eventPublisher.publishFundsDeposited({
          eventName: 'wallet.funds-deposited',
          occurredOn: new Date().toISOString(),
          payload: {
            accountId: account.id,
            userId: account.userId,
            amount: command.amount.toString(),
            currency: account.currency,
            reference: command.reference || '',
            name: userName || `User ${account.userId}`,
            email: userEmail || '',
          },
        });
      } catch (err) {
        console.error('[DepositFundsService] Failed to publish funds-deposited event to RabbitMQ:', err);
      }
    }

    return {
      account,
      duplicate,
      reference: command.reference,
      idempotencyKey: command.idempotencyKey,
    };
  }

  private async fetchUserDetails(userId: string): Promise<{ name?: string; email?: string } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url = `${this.usersServiceUrl!.replace(/\/$/, '')}/api/users/${userId}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      return {
        name: data?.name || data?.fullName || data?.username,
        email: data?.email,
      };
    } catch {
      return null;
    }
  }
}
