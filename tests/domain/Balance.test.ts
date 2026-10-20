import { Balance } from '../../src/domain/value-objects/Balance';
import {
  InvalidAmountException,
  InvalidBalanceException,
} from '../../src/domain/exceptions/DomainExceptions';

describe('Balance Value Object', () => {
  it('should initialize with zero balance', () => {
    const balance = Balance.zero();
    expect(balance.getValue()).toBe(0);
    expect(balance.toString()).toBe('0.00');
  });

  it('should create valid positive balance', () => {
    const balance = Balance.create(150.75);
    expect(balance.getValue()).toBe(150.75);
  });

  it('should throw InvalidBalanceException for negative initial balance', () => {
    expect(() => Balance.create(-10)).toThrow(InvalidBalanceException);
  });

  it('should add funds accurately', () => {
    const b1 = Balance.create(100);
    const b2 = b1.add(50.25);
    expect(b2.getValue()).toBe(150.25);
    expect(b1.getValue()).toBe(100); // Immutability
  });

  it('should throw on non-positive deposit amount', () => {
    const b = Balance.create(100);
    expect(() => b.add(0)).toThrow(InvalidAmountException);
    expect(() => b.add(-20)).toThrow(InvalidAmountException);
  });

  it('should subtract funds accurately', () => {
    const b1 = Balance.create(100);
    const b2 = b1.subtract(40.5);
    expect(b2.getValue()).toBe(59.5);
  });

  it('should throw if withdrawal exceeds balance (non-negative constraint)', () => {
    const b = Balance.create(50);
    expect(() => b.subtract(60)).toThrow(InvalidBalanceException);
  });
});
