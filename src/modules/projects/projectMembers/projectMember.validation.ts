import { z } from 'zod';

export const addMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    role: z.enum(['ADMIN', 'MEMBER'], {
      errorMap: () => ({ message: 'Role must be ADMIN or MEMBER' }),
    }),
  }),
});
