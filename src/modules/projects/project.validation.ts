import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name is required').trim(),
    projectManagerEmail: z.string().email('Invalid email format').optional(),
  }),
});
