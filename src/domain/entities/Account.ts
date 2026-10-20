import { v4 as uuidv4 } from 'uuid';
import { Balance } from '../value-objects/Balance';
import { AccountInactiveException } from '../exceptions/DomainExceptions';

export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';

export interface CreateAccountProps {
  id?: string;
  userId: string;
  currency?: string;
  initialBalance?: number | string;
  status?: AccountStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Account {
  private readonly _id: string;
  private readonly _userId: string;
  private _balance: Balance;
  private readonly _currency: string;
  private _status: AccountStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    userId: string,
    balance: Balance,
    currency: string,
    status: AccountStatus,
    createdAt: Date,
    updatedAt: Date
  ) {
    this._id = id;
    this._userId = userId;
    this._balance = balance;
    this._currency = currency.toUpperCase();
    this._status = status;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  public static create(props: CreateAccountProps): Account {
    const id = props.id || uuidv4();
    const currency = (props.currency || 'COP').toUpperCase();
    const balance = props.initialBalance !== undefined 
      ? Balance.create(props.initialBalance) 
      : Balance.zero();
    const status: AccountStatus = props.status || 'ACTIVE';
    const now = new Date();

    return new Account(
      id,
      props.userId,
      balance,
      currency,
      status,
      props.createdAt || now,
      props.updatedAt || now
    );
  }

  public static reconstitute(
    id: string,
    userId: string,
    balanceValue: number | string,
    currency: string,
    status: AccountStatus,
    createdAt: Date,
    updatedAt: Date
  ): Account {
    return new Account(
      id,
      userId,
      Balance.create(balanceValue),
      currency,
      status,
      createdAt,
      updatedAt
    );
  }

  public deposit(amount: number | string): void {
    if (this._status !== 'ACTIVE') {
      throw new AccountInactiveException(this._status);
    }
    this._balance = this._balance.add(amount);
    this._updatedAt = new Date();
  }

  public block(): void {
    this._status = 'BLOCKED';
    this._updatedAt = new Date();
  }

  public suspend(): void {
    this._status = 'SUSPENDED';
    this._updatedAt = new Date();
  }

  public activate(): void {
    this._status = 'ACTIVE';
    this._updatedAt = new Date();
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get userId(): string {
    return this._userId;
  }

  public get balance(): Balance {
    return this._balance;
  }

  public get currency(): string {
    return this._currency;
  }

  public get status(): AccountStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      balance: this._balance.getValue(),
      currency: this._currency,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
