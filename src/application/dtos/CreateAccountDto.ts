import { z } from 'zod';

export const CreateAccountSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  currency: z.string().length(3, 'currency must be a 3-letter ISO code').default('COP').optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  initialBalance: z.number().min(0, 'initialBalance must be non-negative').default(0).optional(),
});

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;
