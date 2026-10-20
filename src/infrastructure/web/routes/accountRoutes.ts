import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';

export function createAccountRoutes(accountController: AccountController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/accounts:
   *   post:
   *     summary: Create a new account (Paso-5 from Users Service)
   *     tags: [Accounts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateAccountRequest'
   *     responses:
   *       201:
   *         description: Account created successfully (Paso-6 persisted, Paso-7 event emitted)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Account'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: Account already exists for this user and currency
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post('/', accountController.createAccount);

  /**
   * @openapi
   * /api/accounts/user/{userId}:
   *   get:
   *     summary: Retrieve accounts and balances by User ID
   *     tags: [Accounts]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID from Users Service
   *       - in: query
   *         name: currency
   *         required: false
   *         schema:
   *           type: string
   *         description: Optional 3-letter currency filter (e.g. COP)
   *     responses:
   *       200:
   *         description: List of accounts or single account matching filter
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Account'
   *       404:
   *         description: Account not found for specified user and currency
   */
  router.get('/user/:userId', accountController.getAccountsByUserId);

  /**
   * @openapi
   * /api/accounts/{id}:
   *   get:
   *     summary: Retrieve account details by Account UUID
   *     tags: [Accounts]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Account UUID
   *     responses:
   *       200:
   *         description: Account details retrieved
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Account'
   *       404:
   *         description: Account not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get('/:id', accountController.getAccountById);

  /**
   * @openapi
   * /api/accounts/{id}/deposit:
   *   post:
   *     summary: Deposit / recharge funds into an account
   *     description: Uses pessimistic locking and idempotency key checks inside a PostgreSQL transaction. Emits wallet.funds-deposited event to RabbitMQ on new deposit.
   *     tags: [Accounts]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Account UUID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DepositRequest'
   *     responses:
   *       200:
   *         description: Funds deposited successfully or idempotent replay returned
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DepositResponse'
   *       400:
   *         description: Invalid amount or validation error
   *       404:
   *         description: Account not found
   *       422:
   *         description: Account is not in ACTIVE state (e.g. BLOCKED or SUSPENDED)
   */
  router.post('/:id/deposit', accountController.depositFunds);

  return router;
}
