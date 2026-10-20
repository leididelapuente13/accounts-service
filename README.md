# Accounts & Wallet Microservice (`accounts-service`)

Accounts and Wallet Microservice for **"Sistema Distribuido Wallet"**, built following **Hexagonal Architecture (Ports and Adapters)** and **Domain-Driven Design (DDD)** in **TypeScript (Node.js LTS v20+)**.

---

## 1. Architecture & Ecosystem Flow

```
[Users Service] ──(Paso-5: Sync HTTP POST)──> [Accounts Service] ──(Paso-6: Sync SQL)──> [PostgreSQL]
                                                       │
                                                       └──(Paso-7: Async Publish)──> [RabbitMQ] ──(Paso-3)──> [Notification Service] ──(Paso-4)──> [Brevo Email]
```

### Flow Breakdown:
1. **Paso-5 (Sync HTTP from Users Service):**
   - When a user registers in `Users Service`, `Users` calls:
     `POST /api/accounts` with `{ "userId": "<id>", "currency": "COP" }`.
2. **Paso-6 (Sync Database Persistence):**
   - `accounts-service` persists the account in PostgreSQL with `balance = 0.00` and `status = 'ACTIVE'`.
   - Enforces unique account per user and currency.
3. **Paso-7 (Async Publish to RabbitMQ):**
   - Immediately after persistence, `accounts-service` publishes a domain event to topic exchange `domain.events`.
4. **Paso-3 & Paso-4 (Notification Service Consumption):**
   - `notification-service` consumes the message from RabbitMQ and delivers transactional onboarding email through Brevo SMTP.

---

## 2. Hexagonal Architecture Structure

```text
src/
├── domain/                      # Core business logic (framework-agnostic)
│   ├── entities/Account.ts
│   ├── exceptions/DomainExceptions.ts
│   ├── value-objects/Balance.ts
│   └── ports/
│       ├── in/
│       │   ├── CreateAccountUseCase.ts
│       │   ├── GetAccountUseCase.ts
│       │   └── DepositFundsUseCase.ts
│       └── out/
│           ├── AccountRepositoryPort.ts
│           └── EventPublisherPort.ts
│
├── application/                 # Application use cases & DTOs
│   ├── dtos/
│   │   ├── CreateAccountDto.ts
│   │   ├── DepositFundsDto.ts
│   │   └── AccountResponseDto.ts
│   └── services/
│       ├── CreateAccountService.ts
│       ├── GetAccountService.ts
│       └── DepositFundsService.ts
│
├── infrastructure/              # Adapters (Express, PostgreSQL, RabbitMQ, Swagger)
│   ├── config/environment.ts
│   ├── database/
│   │   ├── postgresPool.ts
│   │   ├── migrations.ts
│   │   └── PostgresAccountRepository.ts
│   ├── messaging/RabbitMQEventPublisher.ts
│   └── web/
│       ├── swagger/swaggerConfig.ts
│       ├── controllers/
│       │   ├── AccountController.ts
│       │   └── HealthController.ts
│       ├── routes/accountRoutes.ts
│       └── middlewares/errorHandler.ts
│
├── app.ts                       # Express application wiring & middleware
└── index.ts                     # Bootstrap, database migrations & graceful shutdown
```

---

## 3. Business & Concurrency Rules

- **Unique Active Account per Currency:** Users cannot create duplicate active accounts in the same currency (`UNIQUE (user_id, currency)`).
- **Non-negative Balance:** `balance >= 0` enforced by domain Value Object `Balance` and database `CHECK (balance >= 0)`.
- **Concurrency Control (Pessimistic Locking):** All balance modifications acquire a row-level lock using `SELECT ... FOR UPDATE` inside an isolated PostgreSQL transaction, preventing race conditions and double spending.
- **Idempotency:** Deposit operations require an `idempotencyKey` stored in `account_transactions`. Retried requests return the current state without duplicate crediting.

---

## 4. API Endpoints & Swagger

- **Swagger UI:** `GET /api-docs` (interactive OpenAPI 3.0 UI)
- **Health Check:** `GET /health` (`{"status": "UP"}`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check for Render deployment |
| `GET` | `/api-docs` | Swagger documentation UI |
| `POST` | `/api/accounts` | Creates an account (`Paso-5`) |
| `GET` | `/api/accounts/:id` | Retrieves account by UUID |
| `GET` | `/api/accounts/user/:userId` | Retrieves accounts belonging to a user |
| `POST` | `/api/accounts/:id/deposit` | Deposits funds with pessimistic lock and idempotency |

### Sample Requests

#### 1. Create Account (`POST /api/accounts`)
```bash
curl -X POST http://localhost:8081/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "usr_98765",
    "currency": "COP",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }'
```

#### 2. Deposit Funds (`POST /api/accounts/:id/deposit`)
```bash
curl -X POST http://localhost:8081/api/accounts/<account-uuid>/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "idempotencyKey": "idemp-uuid-4567",
    "reference": "dep-ref-123"
  }'
```

---

## 5. RabbitMQ Domain Events (Paso-7)

- **Exchange:** `domain.events` (Topic, durable)

### 1. Account Created
- **Routing Key:** `user.created` (and `account.created`)
```json
{
  "eventName": "user.created",
  "occurredOn": "2026-10-20T03:00:00.000Z",
  "payload": {
    "userId": "usr_98765",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "accountId": "123e4567-e89b-12d3-a456-426614174000",
    "currency": "COP"
  }
}
```

### 2. Funds Deposited
- **Routing Key:** `wallet.funds-deposited`
```json
{
  "eventName": "wallet.funds-deposited",
  "occurredOn": "2026-10-20T03:00:00.000Z",
  "payload": {
    "accountId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "usr_98765",
    "amount": "50000",
    "currency": "COP",
    "reference": "dep-ref-123"
  }
}
```

---

## 6. Environment Variables (`.env.example`)

```env
PORT=8081
NODE_ENV=development

# Peer Services
USERS_SERVICE_URL=https://users-management-eebg.onrender.com
NOTIFICATION_SERVICE_URL=https://notification-microservice-j779.onrender.com

# Shared RabbitMQ (CloudAMQP)
RABBITMQ_URL=amqps://bkrxoiuo:2fB0lVyaM_ftIMUWHUd_PTzhm2GRg-Xq@fuji.lmq.cloudamqp.com/bkrxoiuo
RABBITMQ_EXCHANGE=domain.events

# PostgreSQL Database (Render)
DB_TYPE=postgres
DB_HOST=dpg-db0sajdg1s2s73ff1u40-a.virginia-postgres.render.com
DB_PORT=5432
DB_NAME=users_5tfw
DB_USERNAME=users_5tfw_user
DB_PASSWORD=jydV6A1p6Fp3x4npyzckzowkaxQOhBJj
DB_SSL=true
```

---

## 7. Local Development & Testing

```bash
# Install dependencies
npm install

# Run database migrations and dev server with hot reload
npm run dev

# Run automated tests
npm test

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 8. Docker & Render Deployment

Multi-stage build Dockerfile provided:

```bash
# Build Docker image
docker build -t accounts-service .

# Run container
docker run -p 8081:8081 --env-file .env accounts-service
```
