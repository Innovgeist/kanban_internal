import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validation';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later.',
});

router.post(
  '/register',
  authLimiter,
  validateRequest(registerSchema),
  AuthController.register
);

router.post(
  '/login',
  authLimiter,
  validateRequest(loginSchema),
  AuthController.login
);

router.post(
  '/refresh',
  validateRequest(refreshSchema),
  AuthController.refresh
);

router.post('/logout', AuthController.logout);

export default router;
