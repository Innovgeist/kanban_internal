import { z } from 'zod';

export const createBoardSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Board name is required').trim(),
  }),
});
