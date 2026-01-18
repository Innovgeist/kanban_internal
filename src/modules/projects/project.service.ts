import { Project } from './project.model';
import { ProjectMember, ProjectRole } from './projectMembers/projectMember.model';
import { AppError } from '../../utils/errors';
import { User } from '../users/user.model';

export class ProjectService {
  static async createProject(
    name: string,
    createdBy: string,
    projectManagerEmail?: string
  ) {
    // Verify creator is SUPERADMIN
    const creator = await User.findById(createdBy);
    if (!creator || creator.role !== 'SUPERADMIN') {
      throw new AppError('Only SuperAdmin can create projects', 403, 'SUPERADMIN_REQUIRED');
    }

    // Create project
    const project = await Project.create({
      name,
      createdBy,
    });

    // If project manager email is provided, assign them as ADMIN
    if (projectManagerEmail) {
      const projectManager = await User.findOne({ email: projectManagerEmail.toLowerCase() });
      if (!projectManager) {
        throw new AppError('Project manager not found', 404, 'PROJECT_MANAGER_NOT_FOUND');
      }

      // Create ProjectMember with ADMIN role for project manager
      await ProjectMember.create({
        projectId: project._id,
        userId: projectManager._id,
        role: 'ADMIN',
      });
    }

    return project;
  }

  static async getUserProjects(userId: string) {
    // Check if user is SuperAdmin
    const user = await User.findById(userId);
    const isSuperAdmin = user?.role === 'SUPERADMIN';

    // Find all projects where user is a member
    const memberships = await ProjectMember.find({ userId }).populate('projectId');
    const memberProjectIds = memberships.map((m) => m.projectId);

    // Build query: projects where user is member OR projects created by SuperAdmin
    const query: any = {};
    if (isSuperAdmin) {
      // SuperAdmin sees all projects they created, even if not a member
      query.$or = [
        { _id: { $in: memberProjectIds } },
        { createdBy: userId }
      ];
    } else {
      // Regular users only see projects where they are members
      query._id = { $in: memberProjectIds };
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Get role for each project
    const projectsWithRoles = await Promise.all(
      projects.map(async (project) => {
        const membership = await ProjectMember.findOne({
          projectId: project._id,
          userId,
        });
        
        // If SuperAdmin created the project but is not a member, show role as null or 'CREATOR'
        const role = membership?.role || (isSuperAdmin && project.createdBy.toString() === userId ? null : undefined);
        
        return {
          ...project.toObject(),
          role: role,
        };
      })
    );

    return projectsWithRoles;
  }

  static async getProjectById(projectId: string) {
    const project = await Project.findById(projectId).populate('createdBy', 'name email');
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    return project;
  }
}
