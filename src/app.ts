import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './infrastructure/web/swagger/swaggerConfig';
import { HealthController } from './infrastructure/web/controllers/HealthController';
import { AccountController } from './infrastructure/web/controllers/AccountController';
import { createAccountRoutes } from './infrastructure/web/routes/accountRoutes';
import { errorHandler } from './infrastructure/web/middlewares/errorHandler';

export function createApp(accountController: AccountController): Application {
  const app = express();

  // Standard Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health Check Endpoint (Render)
  app.get('/health', HealthController.check);

  // Swagger Documentation
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Accounts Microservice - API Documentation',
    })
  );

  // Swagger JSON raw endpoint
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Account Routes
  app.use('/api/accounts', createAccountRoutes(accountController));

  // Root redirect / greeting
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'accounts-service',
      status: 'UP',
      docs: '/api-docs',
      health: '/health',
    });
  });

  // 404 Fallback Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'NotFound',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
