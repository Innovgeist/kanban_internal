import { Project } from './project.model';
import { ProjectMember } from './projectMembers/projectMember.model';
import { AppError } from '../../utils/errors';
import { User } from '../users/user.model';

export class ProjectService {
  static async createProject(name: string, createdBy: string) {
    // Create project
    const project = await Project.create({
      name,
      createdBy,
    });

    // Create ProjectMember with ADMIN role
    await ProjectMember.create({
      projectId: project._id,
      userId: createdBy,
      role: 'ADMIN',
    });

    return project;
  }

  static async getUserProjects(userId: string) {
    // Find all projects where user is a member
    const memberships = await ProjectMember.find({ userId }).populate('projectId');

    const projects = await Project.find({
      _id: { $in: memberships.map((m) => m.projectId) },
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Get role for each project
    const projectsWithRoles = await Promise.all(
      projects.map(async (project) => {
        const membership = await ProjectMember.findOne({
          projectId: project._id,
          userId,
        });
        return {
          ...project.toObject(),
          role: membership?.role,
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
