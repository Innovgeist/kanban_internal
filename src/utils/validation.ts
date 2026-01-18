import { z } from 'zod';
import { Types } from 'mongoose';

export const validateObjectId = (id: string): boolean => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  // MongoDB ObjectId must be exactly 24 hex characters
  if (id.length !== 24) {
    return false;
  }
  return Types.ObjectId.isValid(id);
};

export const objectIdSchema = z.string().refine(
  (id) => Types.ObjectId.isValid(id),
  { message: 'Invalid ObjectId format' }
);
