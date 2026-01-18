import { User } from '../users/user.model';
import { AppError } from '../../utils/errors';
import bcrypt from 'bcrypt';
import { AuthService, AuthTokens } from './auth.service';

export class InvitationService {
  /**
   * Set password using invitation token
   */
  static async setPasswordFromInvitation(
    invitationToken: string,
    password: string
  ): Promise<{ user: any; tokens: AuthTokens }> {
    // Find user by invitation token
    const user = await User.findOne({ invitationToken });

    if (!user) {
      throw new AppError('Invalid invitation token', 400, 'INVALID_INVITATION_TOKEN');
    }

    // Check if token is expired
    if (user.invitationTokenExpires && user.invitationTokenExpires < new Date()) {
      throw new AppError('Invitation token has expired', 400, 'INVITATION_EXPIRED');
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400, 'VALIDATION_ERROR');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user: set password and clear invitation token
    user.passwordHash = passwordHash;
    user.authProvider = 'email';
    user.invitationToken = undefined;
    user.invitationTokenExpires = undefined;
    await user.save();

    // Generate tokens
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

  /**
   * Get invitation details (for testing/admin purposes)
   */
  static async getInvitationDetails(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.invitationToken) {
      throw new AppError('No pending invitation found for this email', 404, 'NO_INVITATION');
    }

    return {
      email: user.email,
      invitationToken: user.invitationToken,
      expiresAt: user.invitationTokenExpires,
      hasPassword: !!user.passwordHash,
    };
  }
}
