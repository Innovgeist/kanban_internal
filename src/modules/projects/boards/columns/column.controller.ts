import { Request, Response, NextFunction } from 'express';
import { ColumnService } from './column.service';

export class ColumnController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { boardId } = req.params;
      const { name, color } = req.body;

      const column = await ColumnService.createColumn(boardId, name, color);

      res.status(201).json({
        success: true,
        data: column,
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const items = req.body;
      const userId = req.user!._id;
      const userRole = req.user!.role;

      const result = await ColumnService.reorderColumns(items, userId, userRole);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      // Get columnId from params (set by requireColumnAdmin middleware) or extract from path
      const columnId = (req as any).columnId || req.params.columnId;
      const { name, color } = req.body;

      if (!columnId) {
        throw new Error('Column ID is required');
      }

      const column = await ColumnService.updateColumn(columnId, name, color);

      res.status(200).json({
        success: true,
        data: column,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      // Get columnId from params (set by requireColumnAdmin middleware) or extract from path
      const columnId = (req as any).columnId || req.params.columnId;

      if (!columnId) {
        throw new Error('Column ID is required');
      }

      const result = await ColumnService.deleteColumn(columnId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
