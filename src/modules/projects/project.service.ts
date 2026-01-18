import { Project } from './project.model';
import { ProjectMember, ProjectRole } from './projectMembers/projectMember.model';
import { Board } from './boards/board.model';
import { Column } from './boards/columns/column.model';
import { Card } from './boards/columns/cards/card.model';
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

    let projects;

    if (isSuperAdmin) {
      // SuperAdmin sees ALL projects (full access)
      projects = await Project.find({})
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Regular users only see projects where they are members
      const memberships = await ProjectMember.find({ userId }).populate('projectId');
      const memberProjectIds = memberships.map((m) => m.projectId);

      projects = await Project.find({
        _id: { $in: memberProjectIds },
      })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    }

    // Get role for each project
    const projectsWithRoles = await Promise.all(
      projects.map(async (project) => {
        const membership = await ProjectMember.findOne({
          projectId: project._id,
          userId,
        });
        
        // SuperAdmin who created project but isn't a member shows role as null
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

  static async updateProject(projectId: string, name: string) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    project.name = name.trim();
    await project.save();

    return project.populate('createdBy', 'name email');
  }

  static async deleteProject(projectId: string) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Get all boards in this project
    const boards = await Board.find({ projectId });
    const boardIds = boards.map((b) => b._id);

    // Get all columns in these boards
    const columns = await Column.find({ boardId: { $in: boardIds } });
    const columnIds = columns.map((c) => c._id);

    // Delete all cards in these columns
    await Card.deleteMany({ columnId: { $in: columnIds } });

    // Delete all columns
    await Column.deleteMany({ boardId: { $in: boardIds } });

    // Delete all boards
    await Board.deleteMany({ projectId });

    // Delete all project members
    await ProjectMember.deleteMany({ projectId });

    // Finally, delete the project
    await Project.findByIdAndDelete(projectId);

    return { message: 'Project deleted successfully' };
  }
}
