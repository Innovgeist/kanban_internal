import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../modules/users/user.model';
import { AppError } from '../utils/errors';
import { config } from '../config/env';
import { TokenPayload } from '../modules/auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        role?: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;

    // Verify user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    req.user = {
      _id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
    next(error);
  }
};
