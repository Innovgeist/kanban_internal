import { z } from 'zod';

export const createCardSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Card title is required').trim(),
    description: z.string().optional(),
  }),
});

export const moveCardSchema = z.object({
  body: z.object({
    columnId: z.string().min(1, 'Column ID is required'),
    order: z.number().int().min(0),
  }),
});
