import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const isDist = __dirname.includes('dist');
const baseDir = isDist ? path.join(__dirname, '..') : path.join(__dirname, '..');
const routesPattern = path.join(baseDir, 'routes', '*.js').replace(/\\/g, '/');
const srcRoutesPattern = path.join(__dirname, '../../../../src/infrastructure/web/routes', '*.ts').replace(/\\/g, '/');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Accounts & Wallet Microservice API',
      version: '1.0.0',
      description:
        'Hexagonal Architecture Microservice responsible for account creation, balance management, pessimistic-locked deposits, and RabbitMQ event streaming.',
      contact: {
        name: 'Sistema Distribuido Wallet Team',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current Environment Server',
      },
      {
        url: 'http://localhost:8081',
        description: 'Local Development Server',
      },
    ],
    components: {
      schemas: {
        Account: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: 'usr_98765',
            },
            balance: {
              type: 'number',
              example: 50000.0,
            },
            currency: {
              type: 'string',
              example: 'COP',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'BLOCKED', 'SUSPENDED'],
              example: 'ACTIVE',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-10-20T03:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-10-20T03:00:00.000Z',
            },
          },
        },
        CreateAccountRequest: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: {
              type: 'string',
              description: 'Unique user identifier from Users Service',
              example: 'usr_98765',
            },
            currency: {
              type: 'string',
              description: '3-letter currency code (defaults to COP)',
              example: 'COP',
            },
            name: {
              type: 'string',
              description: 'User display name (optional, fetched from Users Service if missing)',
              example: 'Jane Doe',
            },
            email: {
              type: 'string',
              description: 'User email (optional, fetched from Users Service if missing)',
              example: 'jane@example.com',
            },
            initialBalance: {
              type: 'number',
              description: 'Initial account balance (default 0)',
              example: 0,
            },
          },
        },
        DepositRequest: {
          type: 'object',
          required: ['amount', 'idempotencyKey'],
          properties: {
            amount: {
              type: 'number',
              description: 'Amount in COP to deposit. Must be greater than 0.',
              example: 50000,
            },
            idempotencyKey: {
              type: 'string',
              description: 'Unique idempotency key to prevent double charge on retries.',
              example: 'dep-idemp-9944a-11bc',
            },
            reference: {
              type: 'string',
              description: 'Optional external deposit reference or payment receipt ID.',
              example: 'deposit-ref-123',
            },
            name: {
              type: 'string',
              description: 'Optional user display name for email notification.',
              example: 'Carlos Ruiz',
            },
            email: {
              type: 'string',
              description: 'Optional recipient email for deposit notification.',
              example: 'carlos@example.com',
            },
          },
        },
        DepositResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Funds deposited successfully',
            },
            duplicate: {
              type: 'boolean',
              description: 'True if operation was an idempotent replay',
              example: false,
            },
            idempotencyKey: {
              type: 'string',
              example: 'dep-idemp-9944a-11bc',
            },
            reference: {
              type: 'string',
              example: 'deposit-ref-123',
            },
            account: {
              $ref: '#/components/schemas/Account',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'DomainException',
            },
            message: {
              type: 'string',
              example: 'Details of what went wrong',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2026-10-20T03:00:00.000Z',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'UP',
            },
          },
        },
      },
      paths: {
        '/health': {
          get: {
            summary: 'Health check endpoint',
            description: 'Returns service health status UP for Render',
            responses: {
              '200': {
                description: 'Service is healthy',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HealthResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/accounts': {
          post: {
            summary: 'Create account (Paso-5 from Users Service)',
            tags: ['Accounts'],
            description: 'Receives user details from Users Service, creates account in PostgreSQL (balance=0.00, status=ACTIVE), and publishes user.created domain event to RabbitMQ.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateAccountRequest',
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Account created successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Account',
                    },
                  },
                },
              },
              '400': {
                description: 'Validation error',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ErrorResponse',
                    },
                  },
                },
              },
              '409': {
                description: 'Account already exists for this user and currency',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ErrorResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/accounts/user/{userId}': {
          get: {
            summary: 'Get accounts by User ID',
            tags: ['Accounts'],
            parameters: [
              {
                in: 'path',
                name: 'userId',
                required: true,
                schema: { type: 'string' },
                description: 'User ID from Users Service',
              },
              {
                in: 'query',
                name: 'currency',
                required: false,
                schema: { type: 'string' },
                description: 'Optional currency filter (COP)',
              },
            ],
            responses: {
              '200': {
                description: 'Account(s) retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Account',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/accounts/{id}': {
          get: {
            summary: 'Get account by Account UUID',
            tags: ['Accounts'],
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                description: 'Account UUID',
              },
            ],
            responses: {
              '200': {
                description: 'Account retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Account',
                    },
                  },
                },
              },
              '404': {
                description: 'Account not found',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ErrorResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/accounts/{id}/deposit': {
          post: {
            summary: 'Deposit funds (Pessimistic lock & Idempotency)',
            tags: ['Accounts'],
            description: 'Locks the account row (SELECT ... FOR UPDATE), validates idempotencyKey, updates balance, and publishes wallet.funds-deposited event to RabbitMQ.',
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                description: 'Account UUID',
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/DepositRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Deposit successful or idempotent replay',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/DepositResponse',
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid deposit amount or missing idempotencyKey',
              },
              '404': {
                description: 'Account not found',
              },
              '422': {
                description: 'Account is inactive (BLOCKED/SUSPENDED)',
              },
            },
          },
        },
      },
    },
  },
  apis: [routesPattern, srcRoutesPattern],
};

export const swaggerSpec = swaggerJsdoc(options);
