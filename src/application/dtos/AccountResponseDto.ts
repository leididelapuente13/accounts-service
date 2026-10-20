import { Account, AccountStatus } from '../../domain/entities/Account';

export interface AccountResponseDto {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DepositResponseDto {
  message: string;
  account: AccountResponseDto;
  idempotencyKey: string;
  reference?: string;
  duplicate: boolean;
}

export function toAccountResponseDto(account: Account): AccountResponseDto {
  return {
    id: account.id,
    userId: account.userId,
    balance: account.balance.getValue(),
    currency: account.currency,
    status: account.status,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
