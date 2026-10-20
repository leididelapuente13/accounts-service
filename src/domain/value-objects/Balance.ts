import { InvalidAmountException, InvalidBalanceException } from '../exceptions/DomainExceptions';

export class Balance {
  private readonly value: number;

  private constructor(value: number) {
    if (isNaN(value)) {
      throw new InvalidBalanceException('Balance must be a valid number');
    }
    if (value < 0) {
      throw new InvalidBalanceException(`Balance cannot be negative: ${value}`);
    }
    // Round to 2 decimal places to avoid floating point rounding issues
    this.value = Math.round(value * 100) / 100;
  }

  public static zero(): Balance {
    return new Balance(0);
  }

  public static create(value: number | string): Balance {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Balance(numericValue);
  }

  public add(amount: number | string): Balance {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new InvalidAmountException('Deposit amount must be a positive number greater than 0');
    }
    return new Balance(this.value + numericAmount);
  }

  public subtract(amount: number | string): Balance {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new InvalidAmountException('Withdrawal amount must be a positive number greater than 0');
    }
    if (this.value < numericAmount) {
      throw new InvalidBalanceException(`Insufficient funds: balance is ${this.value}, attempted debit ${numericAmount}`);
    }
    return new Balance(this.value - numericAmount);
  }

  public getValue(): number {
    return this.value;
  }

  public toString(): string {
    return this.value.toFixed(2);
  }

  public equals(other: Balance): boolean {
    return this.value === other.getValue();
  }
}
