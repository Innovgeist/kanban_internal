import { z } from 'zod';
import { Types } from 'mongoose';

export const validateObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export const objectIdSchema = z.string().refine(
  (id) => Types.ObjectId.isValid(id),
  { message: 'Invalid ObjectId format' }
);
