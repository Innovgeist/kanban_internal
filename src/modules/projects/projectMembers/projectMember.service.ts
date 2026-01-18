import { ProjectMember, ProjectRole } from './projectMember.model';
import { User } from '../../users/user.model';
import { Project } from '../project.model';
import { AppError } from '../../../utils/errors';
import crypto from 'crypto';

export class ProjectMemberService {
  static async addMember(
    projectId: string,
    email: string,
    role: ProjectRole,
    addedBy: { userId: string; role: string }
  ) {
    // Find or create user by email
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // User doesn't exist - create account with invitation
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationTokenExpires = new Date();
      invitationTokenExpires.setHours(invitationTokenExpires.getHours() + 24); // 24 hours expiry

      // Extract name from email (before @)
      const nameFromEmail = email.split('@')[0];

      try {
        user = await User.create({
          name: nameFromEmail,
          email: email.toLowerCase(),
          authProvider: 'email',
          role: 'USER',
          invitationToken,
          invitationTokenExpires,
          passwordHash: undefined, // Explicitly set to undefined - will be set via invitation
        });
      } catch (error: any) {
        // Log the actual error for debugging
        console.error('Error creating user with invitation:', error);
        throw new AppError(
          `Failed to create user: ${error.message || 'Unknown error'}`,
          500,
          'USER_CREATION_ERROR'
        );
      }
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Check if member already exists
    const existingMember = await ProjectMember.findOne({
      projectId,
      userId: user._id,
    });
    if (existingMember) {
      throw new AppError('User is already a member of this project', 400, 'MEMBER_EXISTS');
    }

    // SuperAdmin can assign ADMIN role (project manager), regular ADMIN can only assign MEMBER
    if (role === 'ADMIN' && addedBy.role !== 'SUPERADMIN') {
      throw new AppError('Only SuperAdmin can assign project managers (ADMIN role)', 403, 'SUPERADMIN_REQUIRED');
    }

    // Create membership
    const member = await ProjectMember.create({
      projectId,
      userId: user._id,
      role,
    });

    const populatedMember = await member.populate('userId', 'name email');
    
    // If user was just created (has invitation token), include it in response
    const responseData: any = populatedMember.toObject();
    if (user.invitationToken && !user.passwordHash) {
      responseData.invitationToken = user.invitationToken;
      responseData.invitationExpiresAt = user.invitationTokenExpires;
      responseData.requiresPasswordSetup = true;
    }

    return responseData;
  }

  static async removeMember(projectId: string, userId: string) {
    const member = await ProjectMember.findOneAndDelete({
      projectId,
      userId,
    });

    if (!member) {
      throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    }

    return member;
  }

  static async getProjectMembers(projectId: string) {
    const members = await ProjectMember.find({ projectId })
      .populate('userId', 'name email')
      .sort({ role: 1, createdAt: 1 });

    return members;
  }
}
