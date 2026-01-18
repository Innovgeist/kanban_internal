import { z } from 'zod';

export const createColumnSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Column name is required').trim(),
  }),
});

export const reorderColumnsSchema = z.object({
  body: z.array(
    z.object({
      columnId: z.string().min(1, 'Column ID is required'),
      order: z.number().int().min(0),
    })
  ),
});

export const updateColumnSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Column name is required').trim(),
  }),
});
