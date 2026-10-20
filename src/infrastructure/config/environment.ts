import dotenv from 'dotenv';

dotenv.config();

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  usersServiceUrl: string;
  notificationServiceUrl: string;
  rabbitMq: {
    url: string;
    exchange: string;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
  };
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '8081', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  usersServiceUrl: process.env.USERS_SERVICE_URL || 'https://users-management-eebg.onrender.com',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'https://notification-microservice-j779.onrender.com',
  rabbitMq: {
    url: process.env.RABBITMQ_URL || 'amqps://bkrxoiuo:2fB0lVyaM_ftIMUWHUd_PTzhm2GRg-Xq@fuji.lmq.cloudamqp.com/bkrxoiuo',
    exchange: process.env.RABBITMQ_EXCHANGE || 'domain.events',
  },
  database: {
    host: process.env.DB_HOST || 'dpg-db0sajdg1s2s73ff1u40-a.virginia-postgres.render.com',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'users_5tfw',
    user: process.env.DB_USERNAME || 'users_5tfw_user',
    password: process.env.DB_PASSWORD || 'jydV6A1p6Fp3x4npyzckzowkaxQOhBJj',
    ssl: process.env.DB_SSL === 'false' ? false : true,
  },
};
