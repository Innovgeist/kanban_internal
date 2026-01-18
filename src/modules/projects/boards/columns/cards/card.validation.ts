import { z } from 'zod';

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
  errorMap: () => ({ message: 'Priority must be one of: LOW, MEDIUM, HIGH, URGENT' }),
});

// Date validation - accepts ISO 8601 date strings
const dateSchema = z.union([
  z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format. Use ISO 8601 format (e.g., 2024-02-15T00:00:00.000Z)',
  }),
  z.null(),
]);

export const createCardSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Card title is required').trim(),
    description: z.string().optional(),
    priority: priorityEnum.optional(),
    expectedDeliveryDate: dateSchema.optional(),
    assignedTo: z.array(z.string()).optional(),
  }),
});

export const moveCardSchema = z.object({
  body: z.object({
    columnId: z.string().min(1, 'Column ID is required'),
    order: z.number().int().min(0),
  }),
});

export const updateCardSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Card title is required').trim(),
    description: z.string().optional(),
    priority: z.union([priorityEnum, z.null()]).optional(),
    expectedDeliveryDate: dateSchema.optional(),
    assignedTo: z.array(z.string()).optional(),
  }),
});
