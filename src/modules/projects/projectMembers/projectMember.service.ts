import { ProjectMember, ProjectRole } from './projectMember.model';
import { User } from '../../users/user.model';
import { Project } from '../project.model';
import { AppError } from '../../../utils/errors';

export class ProjectMemberService {
  static async addMember(
    projectId: string,
    email: string,
    role: ProjectRole,
    addedBy: { userId: string; role: string }
  ) {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
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

    return member.populate('userId', 'name email');
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
