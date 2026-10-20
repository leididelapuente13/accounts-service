import { Account } from '../../entities/Account';

export interface CreateAccountCommand {
  userId: string;
  currency?: string;
  name?: string;
  email?: string;
  initialBalance?: number;
}

export interface CreateAccountUseCase {
  execute(command: CreateAccountCommand): Promise<Account>;
}
