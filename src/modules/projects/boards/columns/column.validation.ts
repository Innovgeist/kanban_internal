import { z } from 'zod';

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const createColumnSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Column name is required').trim(),
    color: z.string().regex(hexColorRegex, 'Color must be a valid hex color code (e.g., #3b82f6)').optional(),
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
    color: z.string().regex(hexColorRegex, 'Color must be a valid hex color code (e.g., #3b82f6)').optional(),
  }),
});
