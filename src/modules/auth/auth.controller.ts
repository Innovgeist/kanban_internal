import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './googleAuth.service';
import { InvitationService } from './invitation.service';
import { AppError } from '../../utils/errors';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      const result = await AuthService.register(name, email, password);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
      }

      const result = await AuthService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // For JWT, logout is handled client-side by removing tokens
      // In a more advanced setup, you might maintain a blacklist
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Redirect to Google OAuth
   */
  static async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const authUrl = GoogleAuthService.getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Google OAuth callback
   */
  static async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, error } = req.query;

      // Check for OAuth errors from Google
      if (error) {
        throw new AppError(
          `Google OAuth error: ${error}`,
          400,
          'GOOGLE_OAUTH_ERROR'
        );
      }

      if (!code || typeof code !== 'string') {
        throw new AppError('Authorization code is required', 400, 'CODE_REQUIRED');
      }

      const result = await GoogleAuthService.authenticateWithGoogle(code);

      // Redirect to frontend with tokens
      // In production, use your frontend URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      
      // Encode tokens for URL (they contain special characters)
      const accessToken = encodeURIComponent(result.tokens.accessToken);
      const refreshToken = encodeURIComponent(result.tokens.refreshToken);
      
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;

      res.redirect(redirectUrl);
    } catch (error) {
      // On error, redirect to frontend error page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const errorMessage = error instanceof AppError ? error.message : 'Authentication failed';
      const errorCode = error instanceof AppError ? error.code : 'AUTH_ERROR';
      
      res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(errorMessage)}&code=${errorCode}`);
    }
  }

  /**
   * Set password from invitation token
   */
  static async setPasswordFromInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { invitationToken, password } = req.body;

      if (!invitationToken || !password) {
        throw new AppError('Invitation token and password are required', 400, 'VALIDATION_ERROR');
      }

      const result = await InvitationService.setPasswordFromInvitation(invitationToken, password);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Password set successfully. You are now logged in.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invitation details (for admin/testing)
   */
  static async getInvitationDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
      }

      const details = await InvitationService.getInvitationDetails(email);

      res.status(200).json({
        success: true,
        data: details,
      });
    } catch (error) {
      next(error);
    }
  }
}
