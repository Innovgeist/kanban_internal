import { Request, Response, NextFunction } from 'express';
import { ProjectMemberService } from './projectMember.service';

export class ProjectMemberController {
  static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { email, role } = req.body;
      const addedBy = {
        userId: req.user!._id,
        role: req.user!.role || 'USER',
      };

      const member = await ProjectMemberService.addMember(projectId, email, role, addedBy);

      res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, userId } = req.params;

      await ProjectMemberService.removeMember(projectId, userId);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const members = await ProjectMemberService.getProjectMembers(projectId);

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }
}
