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
        name?: string;
        authProvider?: string;
        avatarUrl?: string | null;
        createdAt?: Date;
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

    // Fetch the user once here so downstream handlers can reuse it.
    const user = await User.findById(decoded.userId)
      .select('_id name email role authProvider avatarUrl createdAt')
      .lean();
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
    next(error);
  }
};
