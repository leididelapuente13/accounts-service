import { DepositFundsCommand, DepositFundsResult, DepositFundsUseCase } from '../../domain/ports/in/DepositFundsUseCase';
import { AccountRepositoryPort } from '../../domain/ports/out/AccountRepositoryPort';
import { EventPublisherPort } from '../../domain/ports/out/EventPublisherPort';
import { InvalidAmountException } from '../../domain/exceptions/DomainExceptions';

export class DepositFundsService implements DepositFundsUseCase {
  constructor(
    private readonly accountRepository: AccountRepositoryPort,
    private readonly eventPublisher: EventPublisherPort
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
}
