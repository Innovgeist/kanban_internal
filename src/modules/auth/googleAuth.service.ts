import { OAuth2Client } from 'google-auth-library';
import { User } from '../users/user.model';
import { AppError } from '../../utils/errors';
import { config } from '../../config/env';
import { AuthService, AuthTokens } from './auth.service';

// Validate Google OAuth configuration
if (!config.google.clientId || !config.google.clientSecret) {
  console.warn('⚠️  Google OAuth credentials not configured. Google OAuth will not work.');
}

const oauth2Client = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class GoogleAuthService {
  /**
   * Get Google OAuth authorization URL
   */
  static getAuthUrl(): string {
    // Validate configuration
    if (!config.google.clientId || !config.google.clientSecret) {
      throw new AppError('Google OAuth is not configured', 500, 'GOOGLE_OAUTH_NOT_CONFIGURED');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return url;
  }

  /**
   * Exchange authorization code for user info
   */
  static async getTokenFromCode(code: string): Promise<string> {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.access_token) {
        throw new AppError('Failed to get access token from Google', 400, 'GOOGLE_AUTH_ERROR');
      }
      return tokens.access_token;
    } catch (error) {
      throw new AppError('Invalid authorization code', 400, 'INVALID_GOOGLE_CODE');
    }
  }

  /**
   * Get user info from Google using access token
   * Uses the newer OAuth2 v2 userinfo endpoint
   */
  static async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      oauth2Client.setCredentials({ access_token: accessToken });
      
      // Use the OAuth2 v2 userinfo endpoint (recommended)
      const { data } = await oauth2Client.request<{
        id: string;
        email: string;
        name?: string;
        picture?: string;
      }>({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      });

      if (!data.email || !data.id) {
        throw new AppError('Invalid user data from Google', 400, 'INVALID_GOOGLE_DATA');
      }

      return {
        id: data.id,
        email: data.email.toLowerCase(),
        name: data.name || data.email.split('@')[0] || 'User',
        picture: data.picture,
      };
    } catch (error: any) {
      // Log the actual error for debugging
      console.error('Google OAuth error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Failed to get user info from Google: ${error.message || 'Unknown error'}`,
        400,
        'GOOGLE_AUTH_ERROR'
      );
    }
  }

  /**
   * Authenticate user with Google OAuth
   * Creates new user or links to existing account
   */
  static async authenticateWithGoogle(code: string): Promise<{ user: any; tokens: AuthTokens }> {
    // Validate configuration
    if (!config.google.clientId || !config.google.clientSecret) {
      throw new AppError('Google OAuth is not configured', 500, 'GOOGLE_OAUTH_NOT_CONFIGURED');
    }

    // Step 1: Exchange code for access token
    const accessToken = await this.getTokenFromCode(code);

    // Step 2: Get user info from Google
    const googleUserInfo = await this.getUserInfo(accessToken);

    // Step 3: Check if user exists by email
    let user = await User.findOne({ email: googleUserInfo.email });

    if (user) {
      // User exists - link Google account
      if (user.authProvider === 'google' && user.googleId === googleUserInfo.id) {
        // Already linked, just update if needed
        if (user.name !== googleUserInfo.name) {
          user.name = googleUserInfo.name;
          await user.save();
        }
      } else if (user.authProvider === 'email') {
        // Link Google to existing email account
        user.googleId = googleUserInfo.id;
        user.authProvider = 'google'; // Switch to Google auth
        // Keep passwordHash in case they want to switch back
        await user.save();
      } else {
        // Different Google account with same email (shouldn't happen, but handle it)
        throw new AppError('Email already registered with different Google account', 400, 'EMAIL_EXISTS');
      }
    } else {
      // New user - create account
      user = await User.create({
        name: googleUserInfo.name,
        email: googleUserInfo.email,
        googleId: googleUserInfo.id,
        authProvider: 'google',
        role: 'USER',
      });
    }

    // Step 4: Generate JWT tokens (same as email/password auth)
    const tokens = AuthService.generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }
}
