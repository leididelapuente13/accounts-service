export class DomainException extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidBalanceException extends DomainException {
  constructor(message: string = 'Account balance cannot be negative') {
    super(message, 400);
  }
}

export class InvalidAmountException extends DomainException {
  constructor(message: string = 'Transaction amount must be greater than zero') {
    super(message, 400);
  }
}

export class AccountNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Account not found: ${identifier}`, 404);
  }
}

export class AccountAlreadyExistsException extends DomainException {
  constructor(userId: string, currency: string) {
    super(`Active account already exists for user ${userId} and currency ${currency}`, 409);
  }
}

export class AccountInactiveException extends DomainException {
  constructor(status: string) {
    super(`Cannot perform operations on account with status '${status}'`, 422);
  }
}

export class DuplicateIdempotencyKeyException extends DomainException {
  constructor(idempotencyKey: string) {
    super(`Duplicate transaction: idempotency key '${idempotencyKey}' has already been processed`, 409);
  }
}
