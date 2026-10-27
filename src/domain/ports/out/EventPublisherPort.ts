export interface UserCreatedEventPayload {
  userId: string;
  name: string;
  email: string;
  accountId?: string;
  currency?: string;
}

export interface DomainEvent<T> {
  eventName: string;
  occurredOn: string;
  payload: T;
}

export interface FundsDepositedEventPayload {
  accountId: string;
  userId: string;
  amount: string;
  currency: string;
  reference?: string;
  name?: string;
  email?: string;
}

export interface EventPublisherPort {
  publishUserCreated(event: DomainEvent<UserCreatedEventPayload>): Promise<void>;
  publishFundsDeposited(event: DomainEvent<FundsDepositedEventPayload>): Promise<void>;
  close(): Promise<void>;
}
