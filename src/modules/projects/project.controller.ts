import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service';

export class ProjectController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, projectManagerEmail } = req.body;
      const userId = req.user!._id;

      const project = await ProjectService.createProject(name, userId, projectManagerEmail);

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!._id;
      const projects = await ProjectService.getUserProjects(userId);

      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const project = await ProjectService.getProjectById(projectId);

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { name } = req.body;

      const project = await ProjectService.updateProject(projectId, name);

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;

      const result = await ProjectService.deleteProject(projectId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
